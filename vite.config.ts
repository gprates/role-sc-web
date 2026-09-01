import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

/**
 * O app NUNCA conhece a `x-api-key`.
 *
 * Em produção quem injeta o header é o CloudFront (Origin Custom Header na
 * origem do API Gateway) — ver docs/DEPLOY_AWS.md. Em desenvolvimento quem
 * injeta é este proxy, lendo `DEV_API_KEY` do `.env.local`. Repare que a
 * variável NÃO tem o prefixo `VITE_`: sem esse prefixo o Vite se recusa a
 * expô-la em `import.meta.env`, então ela fisicamente não entra no bundle.
 *
 * Resultado: o mesmo `fetch('/api/eventos')` funciona nos dois ambientes e a
 * chave só existe do lado do servidor.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const target = env.DEV_API_TARGET ?? 'http://localhost:3000';
  const devApiKey = env.DEV_API_KEY ?? '';

  const apiProxy: ProxyOptions = {
    target,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (devApiKey) proxyReq.setHeader('x-api-key', devApiKey);
      });
    },
  };

  return {
    plugins: [
      vue(),
      // Resolve `~icons/ion/*` em componentes Vue inline, em build time.
      // Só os ícones realmente importados entram no bundle.
      Icons({ compiler: 'vue3', scale: 1 }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': apiProxy },
    },
    preview: {
      port: 4173,
      proxy: { '/api': apiProxy },
    },
    build: {
      outDir: 'dist',
      // Sourcemaps ajudam a debugar o bundle minificado em produção e não são
      // baixados pelo browser a menos que o DevTools esteja aberto.
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia', 'axios'],
          },
        },
      },
    },
  };
});
