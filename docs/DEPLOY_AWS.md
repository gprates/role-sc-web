# Deploy — S3 + CloudFront

Este documento cobre os **três ajustes na AWS** que o site precisa, além do que
você já configurou (bucket, distribuição, domínio, certificado, apontamentos).

| # | Ajuste | Onde | Por quê |
|---|--------|------|---------|
| 1 | Custom error responses 403/404 → `/index.html` | CloudFront | Sem isso, `/favoritos` dá 403 ao recarregar a página |
| 2 | Segunda origem (`/api/*`) com a `x-api-key` como Origin Custom Header | CloudFront | Tira a API key do bundle e elimina o CORS |
| 3 | Comando de publicação | seu terminal | `pnpm deploy` |

---

## 1. SPA fallback (403/404 → index.html)

O site usa `createWebHistory` — URLs limpas, sem `#`. O problema é que o S3 não
sabe disso: quando alguém abre `https://www.role-sc.com.br/favoritos`
diretamente (link compartilhado, F5, favorito do navegador), o S3 procura um
objeto chamado `favoritos` no bucket, não encontra, e devolve **403**
(`AccessDenied`, porque o bucket usa OAC e não tem listagem pública).

A correção é dizer ao CloudFront para servir o `index.html` com status 200
nesses casos — aí o Vue Router assume e desenha a rota certa.

**Console → CloudFront → sua distribuição → aba "Error pages" → Create custom
error response**, duas vezes:

| HTTP error code | Customize error response | Response page path | HTTP Response code |
|-----------------|--------------------------|--------------------|--------------------|
| `403: Forbidden` | Yes | `/index.html` | `200: OK` |
| `404: Not Found` | Yes | `/index.html` | `200: OK` |

Deixe **Error caching minimum TTL = 0** nos dois. Sem isso o CloudFront guarda o
erro e o comportamento fica intermitente e confuso de debugar.

> Se você preferir não mexer nisso agora, a alternativa é trocar
> `createWebHistory` por `createWebHashHistory` em `src/router/index.ts` — as
> URLs viram `role-sc.com.br/#/favoritos` e o problema some. Custa a estética
> das URLs e a indexação por buscadores.

---

## 2. Proxy `/api/*` com a API key injetada pelo CloudFront

### O problema

Um site estático não tem "lado servidor". Tudo que o JavaScript conhece, o
visitante também conhece: basta abrir o DevTools. Se a `x-api-key` fosse
embutida no bundle, qualquer pessoa poderia copiá-la e queimar a sua quota de
10.000 requisições por dia.

No app mobile o risco é menor (a chave está dentro de um APK, dá trabalho
extrair), mas na web ela estaria a dois cliques de distância.

### A solução

Adicionar a API Gateway como **segunda origem** da distribuição que já existe, e
mandar o CloudFront anexar a `x-api-key` em toda requisição que ele encaminha
para lá. O header é adicionado **na borda**, depois que a requisição sai do
browser — o JavaScript nunca vê a chave.

```
Browser                    CloudFront                      AWS
   |                           |                            |
   |-- GET /api/eventos ------>|                            |
   |   (sem chave nenhuma)     |-- GET /eventos ----------->| API Gateway
   |                           |   + x-api-key: abc123      |   (valida a chave)
   |                           |     (origin custom header) |        |
   |                           |                            |        v
   |<-- 200 application/json --|<---------------------------|    Lambda
```

Efeito colateral muito bem-vindo: como o browser chama `/api/...` no **mesmo
domínio** do site, não há requisição cross-origin. Zero CORS, zero preflight
`OPTIONS` — o que também economiza uma ida e volta em cada chamada.

### Passo a passo

#### 2.1 Criar a origem

**CloudFront → sua distribuição → aba "Origins" → Create origin**

| Campo | Valor |
|-------|-------|
| Origin domain | `<id>.execute-api.sa-east-1.amazonaws.com` — só o host, **sem** `https://` e **sem** `/prod` |
| Protocol | HTTPS only |
| Origin path | `/prod` — é o stage name do API Gateway |
| Name | `role-sc-api` |

Ainda na mesma tela, em **Add custom header**:

| Header name | Value |
|-------------|-------|
| `x-api-key` | o valor real da sua API key |

Para descobrir o valor da chave:

```bash
# O ID sai no output do deploy do SAM (RoleScApiKey)
aws apigateway get-api-key --api-key <id-da-chave> --include-value \
  --query value --output text
```

> Esse valor fica salvo na configuração da distribuição, não no repositório.
> Nunca commite a chave.

#### 2.2 Criar o behavior

**Aba "Behaviors" → Create behavior**

| Campo | Valor | Por quê |
|-------|-------|---------|
| Path pattern | `/api/*` | |
| Origin | `role-sc-api` | a origem criada acima |
| Viewer protocol policy | Redirect HTTP to HTTPS | |
| Allowed HTTP methods | `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` | o site usa `PATCH /users/me` |
| Cache policy | **`CachingDisabled`** | resposta de API não pode ser cacheada — senão um usuário veria os dados de outro |
| Origin request policy | **`AllViewerExceptHostHeader`** | precisa repassar o header `Authorization` (o JWT); e o `Host` **não** pode ir, senão o API Gateway rejeita a requisição |

> **`AllViewerExceptHostHeader` é o detalhe que mais gera dor de cabeça.** Com
> a política `AllViewer`, o CloudFront encaminha o `Host: www.role-sc.com.br`
> para o API Gateway, que não reconhece esse domínio e responde
> `403 Forbidden`. A variante `ExceptHostHeader` deixa o CloudFront reescrever
> o Host para o do API Gateway, que é o que faz a coisa funcionar.

#### 2.3 Precedência

Confira na lista de behaviors que **`/api/*` tem precedência menor (aparece
acima) que o `Default (*)`**. O CloudFront avalia de cima para baixo; se o
default vier primeiro, ele tenta buscar `/api/eventos` no bucket S3.

#### 2.4 Testar

Depois que o deploy da distribuição sair de "Deploying":

```bash
# Deve responder 200 com o JSON das categorias.
curl -i https://www.role-sc.com.br/api/categorias
```

Se vier **403**: a origin request policy provavelmente não é
`AllViewerExceptHostHeader`, ou a `x-api-key` está errada.
Se vier **404** com HTML: o behavior `/api/*` não está pegando — cheque a
precedência.

### Se você não quiser fazer isso agora

O site funciona sem o proxy, em "modo direto": preencha `VITE_API_BASE_URL` e
`VITE_API_KEY` no build. Aí o browser chama o API Gateway diretamente e a chave
vai no bundle. `src/services/api.ts` suporta os dois modos e avisa no console
quando está no direto. **Não é o que você deve levar para a defesa do TCC** —
mas destrava um deploy enquanto isso.

---

## 3. Publicar

### Pré-requisito

AWS CLI v2 instalado e autenticado. Nesta máquina ele ainda **não está**:

```powershell
# Windows
winget install -e --id Amazon.AWSCLI
# depois, num terminal novo:
aws configure
```

Recomendação: crie um usuário IAM só para o deploy, com uma policy restrita ao
bucket e à distribuição, em vez de usar suas credenciais raiz:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::SEU-BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::SEU-BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::SEU-ACCOUNT-ID:distribution/SEU-DIST-ID"
    }
  ]
}
```

### Configurar

Em `.env.local`:

```
AWS_S3_BUCKET=nome-do-seu-bucket
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCDEF234567
```

### Rodar

```bash
pnpm deploy        # type-check + build + sync + invalidação
pnpm deploy:only   # só sync + invalidação (reaproveita o dist/ existente)
```

### O que o script faz

Ele sobe os arquivos em **duas passadas**, com `Cache-Control` diferente:

1. **Assets** (`assets/index-a1b2c3.js`) → `max-age=31536000, immutable`.
   O nome tem hash de conteúdo, então mudou o arquivo, mudou o nome — pode ser
   cacheado para sempre com segurança.
2. **HTML** (`index.html`) → `no-cache, must-revalidate`.
   É ele quem aponta para a versão nova dos assets, então nunca pode ficar preso
   no cache.

A ordem importa: assets primeiro. Se o HTML novo subisse antes, por alguns
segundos ele apontaria para arquivos JS que ainda não existem no bucket.

Como consequência, a invalidação do CloudFront cobre só `/` e `/index.html`, em
vez de `/*`. São 2 paths por deploy contra o limite gratuito de 1.000 por mês —
ou seja, ~500 deploys/mês sem custo, contra os ~1.000 de um `/*`, mas sem jogar
fora o cache de todos os assets a cada publicação.

---

## Checklist final

- [ ] Custom error responses 403 e 404 → `/index.html` (200), TTL 0
- [ ] Origem `role-sc-api` criada, com origin path `/prod` e custom header `x-api-key`
- [ ] Behavior `/api/*` com `CachingDisabled` + `AllViewerExceptHostHeader`
- [ ] `/api/*` com precedência acima do `Default (*)`
- [ ] `curl https://www.role-sc.com.br/api/categorias` retorna 200
- [ ] AWS CLI instalado e `aws configure` feito
- [ ] `AWS_S3_BUCKET` e `AWS_CLOUDFRONT_DISTRIBUTION_ID` no `.env.local`
- [ ] `pnpm deploy` conclui sem erro
- [ ] Abrir `https://www.role-sc.com.br/favoritos` direto na barra funciona (não dá 403)
