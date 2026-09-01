#!/usr/bin/env node
/**
 * Publica `dist/` no bucket S3 que serve o site e invalida o cache do
 * CloudFront.
 *
 * Uso:
 *   pnpm deploy        # build + sync + invalidação
 *   pnpm deploy:only   # só sync + invalidação (usa o dist/ que já existe)
 *
 * Configuração — em `.env.local`, `.env.deploy` ou como variável de ambiente:
 *   AWS_S3_BUCKET                    (obrigatório)  ex.: role-sc-site
 *   AWS_CLOUDFRONT_DISTRIBUTION_ID   (opcional)     ex.: E1ABCDEF234567
 *   AWS_PROFILE                      (opcional)     perfil do AWS CLI
 *
 * Pré-requisito: AWS CLI v2 instalado e autenticado (`aws configure`).
 *
 * SOBRE O CACHE
 * O Vite gera os assets com hash no nome (`index-a1b2c3.js`), então eles podem
 * ser cacheados para sempre. O `index.html` não tem hash — é ele quem aponta
 * para a versão nova dos assets, então precisa ser sempre revalidado.
 * Por isso o upload acontece em duas passadas com Cache-Control diferentes.
 * Consequência prática: a invalidação do CloudFront só precisa cobrir o HTML,
 * e não `/*` — o que mantém o deploy dentro das 1.000 invalidações gratuitas
 * por mês.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Lê pares KEY=VALUE de um .env sem depender do pacote dotenv. */
function loadEnvFile(filename) {
  const path = join(ROOT, filename);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    // Variável já exportada no shell tem precedência sobre o arquivo.
    if (value && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile('.env.deploy');
loadEnvFile('.env.local');
loadEnvFile('.env');

const BUCKET = process.env.AWS_S3_BUCKET;
const DISTRIBUTION_ID = process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID;
const PROFILE = process.env.AWS_PROFILE;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function aws(args, label) {
  const full = PROFILE ? [...args, '--profile', PROFILE] : args;
  console.log(`\n▸ ${label}\n  aws ${full.join(' ')}`);
  try {
    execFileSync('aws', full, { stdio: 'inherit', shell: process.platform === 'win32' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      fail(
        'AWS CLI não encontrado.\n' +
          '  Instale a v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html\n' +
          '  Depois rode `aws configure` para autenticar.',
      );
    }
    fail(`Falhou: ${label}`);
  }
}

// --- Validações -------------------------------------------------------------
if (!BUCKET) {
  fail(
    'AWS_S3_BUCKET não definido.\n' +
      '  Copie .env.example para .env.local e preencha o nome do bucket,\n' +
      '  ou rode com a variável na frente do comando.',
  );
}

if (!existsSync(join(DIST, 'index.html'))) {
  fail('dist/index.html não existe. Rode `pnpm build` antes (ou use `pnpm deploy`).');
}

console.log(`\nPublicando em s3://${BUCKET}`);
if (PROFILE) console.log(`Perfil AWS: ${PROFILE}`);

// --- 1. Assets com hash: cache eterno ---------------------------------------
aws(
  [
    's3',
    'sync',
    `${DIST}/`,
    `s3://${BUCKET}/`,
    '--delete',
    '--exclude',
    '*.html',
    '--cache-control',
    'public,max-age=31536000,immutable',
  ],
  'Enviando assets (cache de 1 ano)',
);

// --- 2. HTML: sempre revalidado ---------------------------------------------
// Vai depois dos assets de propósito: se o HTML novo subisse primeiro, por
// alguns segundos ele apontaria para arquivos JS que ainda não existem.
aws(
  [
    's3',
    'sync',
    `${DIST}/`,
    `s3://${BUCKET}/`,
    '--exclude',
    '*',
    '--include',
    '*.html',
    '--cache-control',
    'no-cache,must-revalidate',
    '--content-type',
    'text/html; charset=utf-8',
  ],
  'Enviando HTML (sem cache)',
);

// --- 3. Invalidação do CloudFront -------------------------------------------
if (DISTRIBUTION_ID) {
  aws(
    [
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      DISTRIBUTION_ID,
      '--paths',
      '/',
      '/index.html',
    ],
    'Invalidando o cache do index.html no CloudFront',
  );
} else {
  console.log(
    '\n! AWS_CLOUDFRONT_DISTRIBUTION_ID não definido — pulando a invalidação.\n' +
      '  Os arquivos já estão no bucket, mas o CloudFront pode servir o HTML\n' +
      '  antigo até o TTL expirar.',
  );
}

console.log('\n✓ Deploy concluído. https://www.role-sc.com.br\n');
