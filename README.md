# Rolê SC — Web

Versão web do aplicativo **Rolê SC**, em **Vue 3 + Vite + TypeScript**. Mesmas
telas, mesmo backend e mesmo design system do app mobile — o que muda são as
proporções e os mecanismos que não existem no browser.

Publicado em **https://www.role-sc.com.br** (S3 + CloudFront).

> Parte do ecossistema do TCC: **web-crawler** → **nlp-processor** → **api** →
> **app mobile** / **web** (este projeto).

---

## Stack

| Tecnologia | Uso |
|------------|-----|
| Vue 3 (Composition API, `<script setup>`) | Framework de UI |
| Vite 6 | Dev server e bundler |
| TypeScript 5.9 | Tipagem — modo `strict`, com `noUncheckedIndexedAccess` |
| Vue Router 4 | Roteamento + guards de autenticação |
| Pinia 3 | Estado global (auth, favoritos) |
| Axios | Cliente HTTP com interceptors |
| CSS custom properties + `<style scoped>` | Estilo, sem framework CSS |
| unplugin-icons + @iconify-json/ion | Os mesmos Ionicons do app, inline em build time |
| pnpm | Package manager (consistência com os outros repos) |

**Sem framework CSS de propósito.** O design system do projeto já existe como
tokens (`theme/colors.ts`, `spacing.ts`, `typography.ts` no mobile); traduzi-los
para `:root { --primary: ... }` é uma correspondência 1:1, e mantém o CSS ao
lado do template no mesmo arquivo.

---

## Setup

```bash
# 1. Dependências
pnpm install

# 2. Ambiente
cp .env.example .env.local
#    preencha DEV_API_TARGET e DEV_API_KEY

# 3. Rodar
pnpm dev            # http://localhost:5173
```

### Variáveis de ambiente

Estão todas documentadas em [`.env.example`](./.env.example). A regra que
importa:

> **Variáveis sem o prefixo `VITE_` nunca entram no bundle.**

É por isso que a API key mora em `DEV_API_KEY` e não em `VITE_API_KEY` — ela é
lida pelo proxy do dev server (que roda em Node), não pelo browser.

| Variável | Onde é lida | Vai para o bundle? |
|----------|-------------|--------------------|
| `DEV_API_TARGET` | `vite.config.ts` (Node) | não |
| `DEV_API_KEY` | `vite.config.ts` (Node) | **não** |
| `VITE_GOOGLE_WEB_CLIENT_ID` | browser | sim (é público por natureza) |
| `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `scripts/deploy.mjs` (Node) | não |

---

## A API key nunca chega ao browser

Este é o ponto arquitetural mais importante do projeto, e vale um parágrafo na
monografia.

O API Gateway exige o header `x-api-key` em toda requisição. Num site estático
não existe "lado servidor": tudo que o JavaScript conhece, o visitante também
conhece. Embutir a chave no bundle a deixaria a dois cliques no DevTools, e a
quota de 10.000 req/dia seria de quem quisesse.

A solução é fazer a **infraestrutura** injetar o header, depois que a requisição
já saiu do browser:

| Ambiente | Quem injeta a `x-api-key` |
|----------|---------------------------|
| Produção | CloudFront, via *Origin Custom Header* no behavior `/api/*` |
| Desenvolvimento | O proxy do dev server do Vite, lendo `DEV_API_KEY` |

Nos dois casos o código do app faz a mesma coisa — `GET /api/eventos` — e não
conhece chave nenhuma. De quebra, as chamadas viram same-origin: **zero CORS,
zero requisição preflight**.

A configuração do CloudFront está em [`docs/DEPLOY_AWS.md`](./docs/DEPLOY_AWS.md).

---

## Arquitetura

```
src/
├── main.ts                     # bootstrap: restaura a sessão ANTES de montar
├── App.vue                     # raiz + hosts globais (toasts, diálogo)
├── router/
│   └── index.ts                # rotas + guards (requiresAuth / guestOnly)
├── layouts/
│   ├── AuthLayout.vue          # cartão centrado (login, cadastro, ...)
│   └── AppLayout.vue           # tab bar no mobile ↔ header no desktop
├── views/
│   ├── auth/                   # T01–T06
│   ├── eventos/                # T07–T08
│   ├── favoritos/              # T10
│   ├── perfil/                 # T11–T13
│   └── NaoEncontradoView.vue   # 404 (não existe no mobile)
├── components/                 # AppButton, AppInput, EventoCard, AppIcon, ...
├── composables/                # useEventos, useToast, useConfirm, useAvatarUpload
├── stores/                     # auth, favoritos, passwordReset  (Pinia)
├── services/                   # api, auth, evento, metadata, favoritos, avatar
├── types/                      # cópia direta do app mobile
├── utils/                      # constants, format, password, storage, platform
├── theme/                      # colors.ts (as cores em JS)
└── styles/
    ├── tokens.css              # design system em CSS custom properties
    └── global.css              # reset + escala tipográfica + utilitários
```

### O que veio pronto do app mobile

`types/`, `utils/format.ts` e `utils/password.ts` são **cópia literal** — são
TypeScript puro, sem nenhuma dependência de React Native. `services/` mudou
apenas o necessário. Isso mantém o contrato com a API idêntico entre as duas
plataformas: se o backend mudar, os dois quebram no mesmo lugar.

### Equivalências mobile ↔ web

| App mobile (React Native) | Site (Vue 3) | Nota |
|---------------------------|--------------|------|
| `AuthContext` | `stores/auth.store.ts` | Pinia |
| `useEventos`, `useFavoritos` (hooks) | composable / store | favoritos viraram store global: não precisa de `useFocusEffect` |
| React Navigation (stacks + tabs) | Vue Router + `AppLayout` | |
| `AsyncStorage` | `localStorage` | mesma interface async, para os services não mudarem |
| `Alert.alert` informativo | `useToast` + `ToastHost` | toast não bloqueia a tela |
| `Alert.alert` com botões | `useConfirm` + `ConfirmDialog` | devolve `Promise<boolean>` |
| `FlatList` + `onEndReached` | grade CSS + `IntersectionObserver` | |
| pull-to-refresh | botão de atualizar | o gesto não existe no desktop |
| `Share.share` | `navigator.share`, com fallback para o clipboard | |
| `WebBrowser.openBrowserAsync` | `window.open(..., 'noopener,noreferrer')` | |
| `expo-image-picker` | `<input type="file">` | o SO já oferece a câmera |
| `@expo/vector-icons` (Ionicons) | `unplugin-icons` + `@iconify-json/ion` | mesmos ícones, inline, sem runtime |
| `expo-linear-gradient` | `linear-gradient()` do CSS | |
| `@react-native-google-signin` | Google Identity Services | fora da v1 |

### As proporções

O pedido era "mesmas telas, só mudam as proporções". Onde isso aparece:

| Elemento | < 768px | ≥ 768px |
|----------|---------|---------|
| Navegação | tab bar flutuante no rodapé, igual ao app | header fixo no topo |
| Lista de eventos | 1 card por linha | 2 (≥640px) e 3 (≥1024px) colunas |
| Detalhe do evento | coluna única, barra de ações fixa no rodapé | duas colunas (conteúdo + card de infos), barra de ações no fluxo |
| Telas de auth | largura cheia | cartão de 440px centrado |
| Modal de comentários | bottom sheet | diálogo centrado |
| Escala tipográfica | a do app | um degrau acima |

---

## Divergências propositais em relação ao app

1. **Balneário Camboriú entrou na lista de municípios.** O app mobile lista
   apenas 5 em `utils/constants.ts`, mas a monografia declara 6 municípios-alvo
   e o crawler já coleta eventos de Balneário Camboriú — ou seja, existem
   eventos no banco que o usuário do app **não consegue filtrar**. Aqui a lista
   está completa. Vale corrigir o mobile também.

2. **Existe uma página 404.** Um stack navigator não tem o conceito de "URL
   inválida"; um site tem.

3. **Login com Google está fora da v1.** O código está pronto
   (`composables/useGoogleSignIn.ts`) e o backend já aceita o mesmo audience.
   Para ligar, veja o cabeçalho daquele arquivo.

---

## Scripts

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Dev server em http://localhost:5173, com proxy `/api/*` |
| `pnpm build` | `vue-tsc --noEmit` + build de produção em `dist/` |
| `pnpm type-check` | Só a checagem de tipos |
| `pnpm preview` | Serve o `dist/` localmente, com o mesmo proxy |
| `pnpm deploy` | build + `aws s3 sync` + invalidação do CloudFront |
| `pnpm deploy:only` | Publica o `dist/` que já existe |

---

## Deploy

Ver **[`docs/DEPLOY_AWS.md`](./docs/DEPLOY_AWS.md)** — cobre os custom error
responses do SPA, a configuração do proxy `/api/*` e a estratégia de cache.

---

## Licença / Créditos

Projeto acadêmico (TCC) de Gabriel Prates — 2026.
