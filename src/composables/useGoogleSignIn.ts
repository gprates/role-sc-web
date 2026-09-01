import { ref } from 'vue';

import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Login com Google na web — FORA DA v1 (fica oculto enquanto o client ID
 * não estiver configurado).
 *
 * Diferença em relação ao app mobile: lá o fluxo usa
 * `@react-native-google-signin/google-signin`, que não existe no browser. Aqui
 * usamos o Google Identity Services (GIS), o script oficial `gsi/client`,
 * carregado sob demanda. O resto é idêntico: obtemos um `id_token` e trocamos
 * por um JWT nosso em `POST /auth/google`.
 *
 * O backend valida o `id_token` com `google-auth-library` esperando audience
 * igual a `GOOGLE_WEB_CLIENT_ID` (RN14) — o MESMO client ID Web que o app já
 * usa, então nenhuma mudança no backend é necessária.
 *
 * PARA LIGAR:
 *   1. Google Cloud Console → Credentials → o OAuth Client ID *Web* existente
 *   2. Authorized JavaScript origins: adicionar
 *        https://role-sc.com.br
 *        https://www.role-sc.com.br
 *        http://localhost:5173   (para desenvolvimento)
 *   3. Preencher VITE_GOOGLE_WEB_CLIENT_ID no .env.local / no build de produção
 */
const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? '';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Carrega o script do GIS uma única vez, sob demanda. */
const loadGsiScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Não foi possível carregar o Google Sign-In.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export const useGoogleSignIn = () => {
  const auth = useAuthStore();
  const toast = useToast();
  const loading = ref(false);

  /** True quando não há client ID — a UI esconde o botão nesse caso. */
  const notConfigured = WEB_CLIENT_ID.length === 0;

  const signInWithGoogle = async (): Promise<void> => {
    if (notConfigured) {
      toast.info(
        'Não disponível',
        'O login com Google ainda não está habilitado neste site.',
      );
      return;
    }

    loading.value = true;
    try {
      await loadGsiScript();

      const gsi = window.google?.accounts?.id;
      if (!gsi) throw new Error('Google Sign-In indisponível.');

      const idToken = await new Promise<string | null>((resolve) => {
        gsi.initialize({
          client_id: WEB_CLIENT_ID,
          callback: (response) => resolve(response.credential ?? null),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        gsi.prompt();
      });

      // Usuário fechou o prompt do Google — não é erro, não incomoda com toast.
      if (!idToken) return;

      await auth.signInWithGoogle(idToken);
    } catch (err) {
      toast.error('Não foi possível entrar', extractErrorMessage(err));
    } finally {
      loading.value = false;
    }
  };

  return { signInWithGoogle, loading, notConfigured };
};
