ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY angular.json tsconfig.json tsconfig.app.json .postcssrc.json .prettierrc ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src

ARG API_BASE_URL=http://localhost:3000
ARG CSP_CONNECT_SRC=""

ENV API_BASE_URL=${API_BASE_URL} \
    CSP_CONNECT_SRC=${CSP_CONNECT_SRC}
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=runtime-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

RUN chown -R node:node /app

USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/client/server/server.mjs"]