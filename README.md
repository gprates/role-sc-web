# Rolê SC — Web

Site do **Rolê SC**, que reúne eventos culturais e municipais do litoral norte
de Santa Catarina. É uma SPA em **Vue 3 + Vite + TypeScript**, com as mesmas
telas e o mesmo backend do app mobile. Em produção é publicada como site
estático em **S3 + CloudFront**.

> Parte do sistema do TCC: **webcrawler** → **processador NLP** → **API**
> (`role-sc-api`) → **app mobile** e **site** (este repositório).

## O que o site faz

Todo o conteúdo fica atrás de login; sem sessão, qualquer rota leva a `/login`.

- **Conta:** login por e-mail e senha, cadastro, verificação de e-mail,
  recuperação de senha em 3 etapas e login com Google (opcional, aparece só
  quando o Client ID é configurado).
- **Eventos:** lista com busca e filtros (status, município, categoria e
  período), agrupada por período, com rolagem infinita; detalhe do evento com
  comentários e curtidas; compartilhamento (copia o link).
- **Favoritos:** guardados no servidor, por usuário.
- **Perfil:** edição de nome, troca de senha e foto (upload direto para o S3
  por URL pré-assinada que a API devolve).
- Página 404 para rotas inexistentes.

O site não acessa banco nem fila. Ele só fala com a API, sempre pelo caminho
relativo **`/api`** (mesmo domínio, sem CORS), com o JWT no header
`Authorization`. Quem encaminha `/api/*` para a API, removendo o prefixo
(`/api/eventos` → `/eventos`), depende do ambiente:

| Ambiente | Quem encaminha `/api/*` | `x-api-key` |
|----------|-------------------------|-------------|
| Produção | CloudFront (behavior `/api/*` → API Gateway) | injetada pelo CloudFront (Origin Custom Header) |
| `pnpm dev` / `pnpm preview` | proxy do Vite (`vite.config.ts`), alvo `DEV_API_TARGET` | injetada pelo proxy se `DEV_API_KEY` estiver preenchida |
| Docker | nginx do container, alvo `API_UPSTREAM` | não é injetada (a API local não exige) |

Em nenhum caso a API key vai para o JavaScript do site.

### Stack

Vue 3 (`<script setup>`), Vite 6, TypeScript 5.9 (`strict`), Vue Router 4
(`createWebHistory`, com guards de autenticação), Pinia 3, Axios,
CSS com custom properties (sem framework CSS) e `unplugin-icons` com Ionicons.
Gerenciador de pacotes: pnpm.

---

## Rodar localmente

### Pré-requisitos

- Node.js **>= 20.19** (testado com 24.21)
- pnpm (testado com 12.5.1)
- A API rodando localmente: no repositório `role-sc-api`, `pnpm dev` sobe a
  API em `http://localhost:3000`, com rotas sem o prefixo `/api`.

### Passo a passo

```bash
pnpm install --frozen-lockfile

cp .env.example .env.local     # DEV_API_TARGET já aponta para http://localhost:3000

pnpm dev                       # http://localhost:5173
```

Para usar outra API sem editar o arquivo, passe a variável no shell (ela tem
precedência sobre o `.env.local`):

```bash
DEV_API_TARGET=http://127.0.0.1:3000 pnpm dev
```

> **Cuidado:** o Vite carrega o `.env.local` em `pnpm dev`, `pnpm preview` e
> `pnpm build`. Se o `DEV_API_TARGET` dele apontar para a API de produção, o
> desenvolvimento local grava dados reais (login, favoritos, comentários).
> Para desenvolvimento, use sempre a API local.

### Outros comandos

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Dev server em http://localhost:5173, com proxy `/api/*` |
| `pnpm type-check` | Só a checagem de tipos (`vue-tsc --noEmit`) |
| `pnpm build` | Checagem de tipos + build de produção em `dist/` |
| `pnpm build:only` | Build sem a checagem de tipos |
| `pnpm preview` | Serve o `dist/` em http://localhost:4173, com o mesmo proxy `/api/*` |
| `pnpm run deploy` | Build + publicação na AWS (ver [Deploy](#deploy)) |
| `pnpm run deploy:only` | Publica o `dist/` existente, sem build |

Não há testes automatizados nem lint; a verificação automática é o
`pnpm type-check` (também executado pelo `pnpm build`).

---

## Rodar com Docker

O `Dockerfile` faz o build em duas etapas: `node:24-alpine` roda
`pnpm install --frozen-lockfile` e `pnpm build`, e `nginx:1.28-alpine` serve o
`dist/`. O nginx:

- devolve o `index.html` para qualquer rota que não seja arquivo (fallback de
  SPA, como os custom error responses do CloudFront);
- encaminha `/api/*` para `API_UPSTREAM`, removendo o prefixo `/api` (como o
  CloudFront e o proxy do Vite). O nome do upstream é resolvido a cada
  requisição, então o container sobe mesmo sem a API no ar;
- responde `502 {"success":false,"message":"API indisponível no momento."}`
  quando a API não responde;
- usa `Cache-Control` de 1 ano em `/assets/*` (nomes com hash) e
  `no-cache` no `index.html`;
- expõe `GET /healthz` (200 `ok`), usado pelo `HEALTHCHECK` da imagem.

O `.dockerignore` exclui `.env`, `.env.local` e qualquer `.env.*` (menos o
`.env.example`), então nenhum valor local entra na imagem.

### Build e execução

```bash
docker build -t role-sc-web .

# API rodando na máquina host, na porta 3000 (Docker Desktop):
docker run --rm -p 8080:80 \
  -e API_UPSTREAM=http://host.docker.internal:3000 \
  role-sc-web
# -> http://localhost:8080
```

No Linux, acrescente `--add-host=host.docker.internal:host-gateway` para que
`host.docker.internal` exista dentro do container.

Com login Google (o Client ID é público e vai no bundle, por isso é definido
no build):

```bash
docker build --build-arg VITE_GOOGLE_WEB_CLIENT_ID=<client-id-web> -t role-sc-web .
```

### Em um docker-compose

O padrão de `API_UPSTREAM` é `http://api:3000`, ou seja, um serviço chamado
`api` na mesma rede do compose, escutando na porta 3000:

```yaml
services:
  web:
    build:
      context: ./role-sc-web
      args:
        VITE_GOOGLE_WEB_CLIENT_ID: ""     # vazio esconde o botão do Google
    ports:
      - "8080:80"
    environment:
      API_UPSTREAM: http://api:3000       # padrão; pode ser omitido
    depends_on:
      - api
```

### Variáveis do container

| Variável | Tipo | Padrão | Descrição |
|----------|------|--------|-----------|
| `API_UPSTREAM` | runtime (`-e`) | `http://api:3000` | Origem da API: `esquema://host[:porta]`, **sem** barra e sem caminho no final. Recebe `/api/x` como `/x`. |
| `VITE_GOOGLE_WEB_CLIENT_ID` | build (`--build-arg`) | vazio | Client ID Web do Google. Vazio esconde o botão "Continuar com Google". |
| `VITE_CLARITY_PROJECT_ID` | build (`--build-arg`) | vazio | Project ID do Microsoft Clarity. Vazio deixa o Clarity desligado. |

Porta interna: **80**. O container não injeta `x-api-key`; para falar com um
API Gateway use o fluxo de produção (CloudFront) ou o `pnpm dev` com
`DEV_API_KEY`.

---

## Variáveis de ambiente

Todas estão comentadas no [`.env.example`](./.env.example). Copie-o para
`.env.local` (ignorado pelo git). **Só as variáveis com prefixo `VITE_` entram
no bundle**, e por isso ficam visíveis para qualquer visitante; as demais são
lidas apenas por Node.

| Variável | Lida por | Vai para o bundle? | Padrão / exemplo | Para que serve |
|----------|----------|--------------------|------------------|----------------|
| `DEV_API_TARGET` | `vite.config.ts` (dev e preview) | não | `http://localhost:3000` | Alvo do proxy `/api/*` |
| `DEV_API_KEY` | `vite.config.ts` (dev e preview) | não | vazio | `x-api-key` injetada pelo proxy (só se o alvo for o API Gateway) |
| `VITE_GOOGLE_WEB_CLIENT_ID` | `src/composables/useGoogleSignIn.ts` | **sim** (público) | vazio | Client ID Web do Google; vazio esconde o botão |
| `VITE_CLARITY_PROJECT_ID` | `src/main.ts` | **sim** (público) | vazio | Project ID do Microsoft Clarity; vazio deixa o Clarity desligado |
| `VITE_API_BASE_URL` | `src/services/api.ts` | **sim** | não definida | "Modo direto": o browser chama a API sem o proxy. Não recomendado |
| `VITE_API_KEY` | `src/services/api.ts` | **sim** (fica exposta) | não definida | `x-api-key` do modo direto. Não recomendado |
| `AWS_S3_BUCKET` | `scripts/deploy.mjs` | não | — | Bucket S3 do site (obrigatória no deploy) |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `scripts/deploy.mjs` | não | — | Distribuição a invalidar (opcional) |
| `AWS_PROFILE` | `scripts/deploy.mjs` | não | — | Perfil do AWS CLI (opcional) |
| `API_UPSTREAM` | nginx do container | não | `http://api:3000` | Ver [Docker](#rodar-com-docker); não é lida do `.env.local` |

O Client ID do Google precisa ser o mesmo `GOOGLE_WEB_CLIENT_ID` que a API usa
como audience, e a origem do site precisa estar em "Authorized JavaScript
origins" no Google Cloud Console.

O `scripts/deploy.mjs` lê `.env.deploy`, `.env.local` e `.env`, nessa ordem; o
primeiro valor não vazio encontrado vale, e o que já estiver no shell tem
precedência sobre os arquivos.

### Microsoft Clarity

O site usa o [Microsoft Clarity](https://clarity.microsoft.com/) (pacote
`@microsoft/clarity`) para heatmaps e gravação de sessões. Ele é iniciado uma
única vez no `src/main.ts` e só quando `VITE_CLARITY_PROJECT_ID` tem valor:
**sem o ID, o Clarity fica desligado** (nenhum script é carregado). O ID fica
no painel do Clarity, em Settings → Overview, e é público (vai no bundle).

- **Local:** coloque o ID no `.env.local`.
- **Deploy:** o ID entra no bundle durante o `pnpm build`, que o
  `pnpm run deploy` roda na máquina que publica. Ele precisa estar no
  `.env.local` (ou no shell) dessa máquina; o `.env.deploy` **não** serve,
  porque só o `scripts/deploy.mjs` lê esse arquivo, depois do build. O
  `pnpm run deploy:only` publica o `dist/` como está, com o ID do último build.
- **Docker:** `--build-arg VITE_CLARITY_PROJECT_ID=<id>`.

---

## Deploy

O deploy é manual, feito da máquina do desenvolvedor: build local, envio do
`dist/` para o S3 e invalidação do cache do CloudFront. Não há CI/CD, e a
imagem Docker não faz parte desse processo.

### Configuração única (console da AWS)

Descrita em [`docs/DEPLOY_AWS.md`](./docs/DEPLOY_AWS.md); nada disso está
versionado. Parte do princípio de que bucket, distribuição, certificado e DNS
já existem.

1. **Fallback de SPA no CloudFront:** custom error responses `403` e `404` →
   `/index.html` com status `200` e TTL de erro 0.
2. **Origem da API:** segunda origem apontando para o host do API Gateway
   (HTTPS only, origin path com o stage), com os **Origin Custom Headers
   `x-api-key`** (a chave da API) e **`x-client: web`** (identifica o site
   nos logs da API).
3. **Behavior `/api/*`:** todos os métodos HTTP, cache policy
   `CachingDisabled`, origin request policy `AllViewerExceptHostHeader`,
   avaliado antes do `Default (*)`.
4. **Credenciais:** AWS CLI v2 instalado e autenticado (de preferência um
   usuário IAM só para o deploy, com a policy de exemplo do documento).

A API responde nas rotas **sem** o prefixo `/api`; o `docs/DEPLOY_AWS.md` não
descreve como o CloudFront remove esse prefixo, então confira esse ponto na
distribuição antes de recriá-la.

### Configuração do script

No `.env.local`, no `.env.deploy` ou no shell:

```
AWS_S3_BUCKET=<nome-do-bucket>
AWS_CLOUDFRONT_DISTRIBUTION_ID=<id-da-distribuicao>   # opcional
AWS_PROFILE=<perfil-do-aws-cli>                       # opcional
```

### A cada publicação

```bash
pnpm run deploy        # pnpm build + scripts/deploy.mjs
pnpm run deploy:only   # só scripts/deploy.mjs, com o dist/ que já existe
```

Use `pnpm run deploy`, e não `pnpm deploy`: `deploy` também é um comando
embutido do pnpm ("deploy a package from a workspace"), que tem precedência
sobre o script do `package.json`. O `deploy:only` não tem esse conflito.

O `scripts/deploy.mjs`:

1. confere se `AWS_S3_BUCKET` está definido e se `dist/index.html` existe;
2. `aws s3 sync dist/ s3://<bucket>/ --delete --exclude '*.html'` com
   `Cache-Control: public,max-age=31536000,immutable` (assets);
3. `aws s3 sync` só dos `*.html`, com `Cache-Control: no-cache,must-revalidate`
   (depois dos assets, para o HTML novo nunca apontar para arquivos que ainda
   não subiram);
4. se `AWS_CLOUDFRONT_DISTRIBUTION_ID` estiver definido,
   `aws cloudfront create-invalidation --paths / /index.html`; senão, só avisa.

Observações:

- O build de produção também lê o `.env.local` da máquina que publica: é dele
  que vêm o `VITE_GOOGLE_WEB_CLIENT_ID` e o `VITE_CLARITY_PROJECT_ID` do bundle.
- Os arquivos copiados de `public/` (imagens, favicons, `robots.txt`) não têm
  hash no nome, mas também sobem com cache de 1 ano; a invalidação cobre só
  `/` e `/index.html`.
- O build gera source maps (`build.sourcemap: true`), que são publicados junto.
- Depois do deploy, abra uma rota interna direto na barra (ex.: `/favoritos`)
  e chame `/api/eventos` no domínio do site para conferir o fallback e o proxy
  (checklist no fim do `docs/DEPLOY_AWS.md`).

---

## Estrutura

```
src/
├── main.ts              # bootstrap: restaura a sessão antes de montar o app
├── App.vue              # raiz + hosts globais (toasts, diálogo de confirmação)
├── router/index.ts      # rotas + guards (requiresAuth / guestOnly)
├── layouts/             # AuthLayout (cartão centrado), AppLayout (tab bar ↔ header)
├── views/               # auth/, eventos/, favoritos/, perfil/, NaoEncontradoView
├── components/          # cards, filtros, modais, comentários, inputs, ícones
├── composables/         # useEventos, useComentarios, useAvatarUpload, useGoogleSignIn, ...
├── stores/              # Pinia: auth, favoritos, passwordReset
├── services/            # api (Axios + interceptors) e um service por recurso da API
├── types/               # contratos da API (mesmos tipos do app mobile)
├── utils/               # constantes, datas/períodos, JWT, storage, redirect, share
├── theme/ e styles/     # design system (cores em TS, tokens em CSS)
docker/default.conf.template   # nginx do container (fallback de SPA + proxy /api)
scripts/deploy.mjs             # publicação no S3 + invalidação do CloudFront
docs/DEPLOY_AWS.md             # configuração do CloudFront e do deploy
```

Detalhes de implementação que valem conhecer:

- **Sessão:** o JWT e o usuário ficam no `localStorage` (`@rolesc/token` e
  `@rolesc/user`); um `401` da API encerra a sessão e leva ao login.
- **Listas fixas:** categorias e municípios estão em `src/utils/constants.ts` e
  precisam acompanhar o backend.
- **Respostas da API:** `{ success: true, data, pagination? }` e, em erro,
  `{ success: false, message, code? }`.

---

## Créditos

Projeto acadêmico (TCC) de Gabriel Prates — 2026.

## Licença

Distribuído sob a licença MIT. Veja o arquivo LICENSE.
