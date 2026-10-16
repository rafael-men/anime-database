import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import Redis from 'ioredis';

export interface KeycloakTokens {
   access_token: string;
   id_token: string;
}

interface OidcMetadata {
   issuer: string;
   authorization_endpoint: string;
   token_endpoint: string;
   end_session_endpoint: string;
}

interface IdTokenClaims {
   sub: string;
   email?: string;
   preferred_username?: string;
   realm_access?: { roles?: string[] };
}

const STATE_PREFIX = 'oidc-state:';
const STATE_TTL_SECONDS = 600;

@Injectable()
export class KeycloakService {
   private readonly logger = new Logger(KeycloakService.name);
   private readonly issuer: string;
   private readonly clientId: string;
   private readonly clientSecret: string;
   private readonly redirectUri: string;
   private readonly adminRole: string;
   private readonly redisUrl: string;

   private metadata?: OidcMetadata;
   private jwks?: ReturnType<typeof createRemoteJWKSet>;

   constructor(private readonly config: ConfigService) {
      this.issuer = this.requireConfig('KEYCLOAK_ISSUER');
      this.clientId = this.requireConfig('KEYCLOAK_CLIENT_ID');
      this.clientSecret = this.requireConfig('KEYCLOAK_CLIENT_SECRET');
      this.redirectUri = this.requireConfig('KEYCLOAK_REDIRECT_URI');
      this.adminRole = this.config.get('KEYCLOAK_ADMIN_ROLE', 'admin');
      this.redisUrl = this.requireConfig('UPSTASH_REDIS_REST_URL');

      if (!this.redirectUri.startsWith(this.issuer.replace(/\/realms\/.*$/, ''))) {
         this.logger.warn('KEYCLOAK_REDIRECT_URI nao parece pertencer ao mesmo host do Keycloak.');
      }
   }

   private requireConfig(name: string): string {
      const value = this.config.get<string>(name)?.trim();
      if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
      return value;
   }

   private async getMetadata(): Promise<OidcMetadata> {
      if (!this.metadata) {
         const url = `${this.issuer}/.well-known/openid-configuration`;
         const res = await fetch(url);
         if (!res.ok) {
            throw new BadRequestException(`Falha ao consultar o Keycloak: HTTP ${res.status}`);
         }
         const body = (await res.json()) as OidcMetadata;
         if (body.issuer !== this.issuer) {
            throw new BadRequestException('Issuer do Keycloak diverge do configurado.');
         }
         this.metadata = body;
      }
      return this.metadata;
   }

   private getJwks() {
      if (!this.jwks) {
         this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
      }
      return this.jwks;
   }
   async createAuthorizationRequest(): Promise<{ url: string; state: string }> {
      const metadata = await this.getMetadata();
      const state = randomBytes(24).toString('base64url');
      const codeVerifier = randomBytes(48).toString('base64url');
      const codeChallenge = createHash('sha256')
         .update(codeVerifier)
         .digest('base64url');

      const payload = JSON.stringify({ codeVerifier, createdAt: Date.now() });
      await this.persistState(state, payload);

      const params = new URLSearchParams({
         response_type: 'code',
         client_id: this.clientId,
         redirect_uri: this.redirectUri,
         scope: 'openid profile email',
         state,
         code_challenge: codeChallenge,
         code_challenge_method: 'S256',
      });

      return { url: `${metadata.authorization_endpoint}?${params.toString()}`, state };
   }

   private async persistState(state: string, payload: string): Promise<void> {
      const { resolveRedisUrl } = await import('../../data/sessions.js');
      const url = resolveRedisUrl(this.config) ?? this.redisUrl;
      const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      await client.connect();
      try {
         await client.set(STATE_PREFIX + state, payload, 'EX', STATE_TTL_SECONDS);
      } finally {
         await client.quit();
      }
   }

   private async consumeState(state: string): Promise<{ codeVerifier: string }> {
      const { resolveRedisUrl } = await import('../../data/sessions.js');
      const url = resolveRedisUrl(this.config) ?? this.redisUrl;
      const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      await client.connect();
      try {
         const raw = await client.get(STATE_PREFIX + state);
         if (raw) await client.del(STATE_PREFIX + state);
         if (!raw) {
            throw new BadRequestException('Sessao de login expirada ou invalida.');
         }
         const parsed = JSON.parse(raw) as { codeVerifier: string; createdAt: number };
         if (Date.now() - parsed.createdAt > STATE_TTL_SECONDS * 1000) {
            throw new BadRequestException('Sessao de login expirada.');
         }
         return { codeVerifier: parsed.codeVerifier };
      } finally {
         await client.quit();
      }
   }

   async exchangeCode(code: string, state: string): Promise<AdminIdentity> {
      const metadata = await this.getMetadata();
      const { codeVerifier } = await this.consumeState(state);

      const res = await fetch(metadata.token_endpoint, {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
         body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code_verifier: codeVerifier,
         }).toString(),
      });

      if (!res.ok) {
         this.logger.error(`Token endpoint respondeu HTTP ${res.status}`);
         throw new BadRequestException('Falha ao autenticar no Keycloak.');
      }

      const tokens = (await res.json()) as KeycloakTokens;
      const { payload } = await jwtVerify(tokens.id_token, this.getJwks(), {
         issuer: this.issuer,
         audience: this.clientId,
      });

      const claims = payload as IdTokenClaims;
      const roles = claims.realm_access?.roles ?? [];

      if (!roles.includes(this.adminRole)) {
         this.logger.warn(`Usuario ${claims.sub} autenticado sem a role ${this.adminRole}.`);
         throw new BadRequestException('Sem permissao de administracao.');
      }

      return {
         sub: claims.sub,
         email: claims.email ?? '',
         username: claims.preferred_username ?? claims.sub,
         roles,
      };
   }

   async buildLogoutUrl(idTokenHint?: string): Promise<string> {
      const metadata = await this.getMetadata();
      const params = new URLSearchParams({
         client_id: this.clientId,
         post_logout_redirect_uri: this.config.get('ADMIN_FRONTEND_URL', 'http://localhost:4000') + '/control',
      });
      if (idTokenHint) params.set('id_token_hint', idTokenHint);
      return `${metadata.end_session_endpoint}?${params.toString()}`;
   }
}

export interface AdminIdentity {
   sub: string;
   email: string;
   username: string;
   roles: string[];
}