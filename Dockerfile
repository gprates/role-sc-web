# Site do Rolê SC: build com Node + pnpm e entrega estática com nginx.
#
#   docker build -t role-sc-web .
#   docker run --rm -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:3000 role-sc-web
#
# Variáveis de build (--build-arg):
#   VITE_GOOGLE_WEB_CLIENT_ID  Client ID Web do Google (público, vai no bundle).
#                              Vazio (padrão) esconde o botão "Continuar com Google".
# Variáveis de runtime (-e):
#   API_UPSTREAM               Para onde o nginx encaminha /api/* (sem o prefixo).
#                              Padrão: http://api:3000 (serviço "api" do compose).

# --- 1. Build ----------------------------------------------------------------
FROM node:24-alpine AS build

ARG PNPM_VERSION=12.5.1
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app

# Dependências primeiro, para aproveitar o cache de camadas.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# O .dockerignore exclui todos os .env* (menos o .env.example), então só
# entra no bundle o que for passado aqui.
ARG VITE_GOOGLE_WEB_CLIENT_ID=""
ENV VITE_GOOGLE_WEB_CLIENT_ID=${VITE_GOOGLE_WEB_CLIENT_ID}

# vue-tsc --noEmit + vite build -> dist/
RUN pnpm build

# --- 2. Runtime ----------------------------------------------------------------
FROM nginx:1.28-alpine

ENV API_UPSTREAM=http://api:3000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
