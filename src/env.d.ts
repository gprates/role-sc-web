/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/vue" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /**
   * Só preencher para o "modo direto" (sem proxy CloudFront), em que o browser
   * chama o API Gateway diretamente. Ver src/services/api.ts.
   */
  readonly VITE_API_BASE_URL?: string;
  /** Idem — só no modo direto. A chave FICA VISÍVEL no bundle. */
  readonly VITE_API_KEY?: string;
  /** Client ID Web do Google OAuth. Vazio = botão do Google fica oculto. */
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
