# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# deps: instala todas as dependencias (incluindo dev) para build e testes.
# Python/make/g++ sao necessarios para compilar modulos nativos (ex.: bcrypt).
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# build: compila o NestJS e remove as dependencias de desenvolvimento.
FROM deps AS build

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build \
    && npm prune --omit=dev

# runtime: somente o necessario para rodar `node dist/main`.
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    UPLOADS_DIR=/app/uploads

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Diretorio de avatares servido em /uploads (ver src/main.ts).
RUN mkdir -p "${UPLOADS_DIR}" \
    && chown -R node:node /app

USER node

EXPOSE 3000

# Sonda de liveness: /health nao depende de MySQL/Redis (ver health.controller.ts).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]