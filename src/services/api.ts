import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { STORAGE_KEYS } from '@/utils/constants';
import { storage } from '@/utils/storage';

/**
 * Cliente HTTP do site.
 *
 * MODO PADRÃO (recomendado) — `VITE_API_BASE_URL` vazio:
 *   baseURL = '/api'. As requests são same-origin e quem coloca a
 *   `x-api-key` é a infraestrutura, não o JavaScript:
 *     · produção  → CloudFront, via Origin Custom Header (docs/DEPLOY_AWS.md)
 *     · dev local → proxy do Vite, lendo DEV_API_KEY (vite.config.ts)
 *   Ganhos: a chave nunca chega ao browser, e não há CORS nem preflight.
 *
 * MODO DIRETO (fallback) — `VITE_API_BASE_URL` preenchido:
 *   O browser chama o API Gateway diretamente e a `VITE_API_KEY` vai junto,
 *   embutida no bundle. Funciona, mas a chave fica legível para qualquer um
 *   que abrir o DevTools. Existe só para destravar um deploy antes do proxy
 *   estar configurado.
 */
const DIRECT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const DIRECT_API_KEY = import.meta.env.VITE_API_KEY ?? '';
const isDirectMode = DIRECT_BASE_URL.length > 0;

if (isDirectMode && import.meta.env.DEV) {
  console.warn(
    '[api] Modo direto ativo (VITE_API_BASE_URL definido). A x-api-key vai ' +
      'embutida no bundle e fica visível para qualquer visitante. Prefira o ' +
      'proxy /api/* no CloudFront — ver docs/DEPLOY_AWS.md.',
  );
}

/**
 * Callback invocado quando o backend responde 401. O store de auth injeta
 * aqui um handler que faz logout e manda o usuário pro login. Evita acoplar
 * a camada HTTP ao Pinia.
 */
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

const api: AxiosInstance = axios.create({
  baseURL: isDirectMode ? DIRECT_BASE_URL : '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Só no modo direto. No modo proxy quem injeta é CloudFront/Vite.
    if (isDirectMode && DIRECT_API_KEY) {
      config.headers.set('x-api-key', DIRECT_API_KEY);
    }

    const token = await storage.get<string>(STORAGE_KEYS.token);
    if (token) config.headers.set('Authorization', `Bearer ${token}`);

    if (import.meta.env.DEV) {
      const method = (config.method ?? 'GET').toUpperCase();
      const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
      const params = config.params ? ` params=${JSON.stringify(config.params)}` : '';
      console.log(`[api] → ${method} ${url}${params}${token ? ' (auth)' : ''}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (res) => {
    if (import.meta.env.DEV) {
      const method = (res.config.method ?? 'GET').toUpperCase();
      console.log(`[api] ← ${res.status} ${method} ${res.config.url ?? ''}`);
    }
    return res;
  },
  (error: AxiosError<{ success: false; message: string }>) => {
    if (import.meta.env.DEV) {
      const method = (error.config?.method ?? 'GET').toUpperCase();
      const status = error.response?.status ?? 'no-response';
      const body = error.response?.data;
      console.log(
        `[api] ✕ ${status} ${method} ${error.config?.url ?? ''}` +
          (body ? ` body=${JSON.stringify(body)}` : ` err=${error.message}`),
      );
    }

    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

/**
 * Extrai uma mensagem amigável de qualquer erro vindo da API.
 * Usado nas telas para alimentar toasts.
 */
export const extractErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (err.code === 'ECONNABORTED') {
      return 'A requisição demorou demais. Tente novamente.';
    }
    if (err.message === 'Network Error') {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Ocorreu um erro inesperado.';
};

export default api;
