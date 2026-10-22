import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { consumirRedirect } from '@/utils/redirect';

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

/** Limites de largura que o GIS aceita para o botão renderizado. */
const BUTTON_MIN_WIDTH = 200;
const BUTTON_MAX_WIDTH = 400;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
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

/**
 * O GIS quer um único `initialize()` por página, com um único callback. Como
 * o botão aparece em mais de uma tela, o callback fixo só repassa o token para
 * quem estiver montado no momento.
 */
let gsiInitialized = false;
let credentialHandler: ((idToken: string) => void) | null = null;

/**
 * Renderiza o botão oficial "Continuar com o Google" dentro de `parent` e
 * devolve a função de limpeza (chamar no unmount).
 *
 * Por que o botão do Google e não um botão nosso chamando `prompt()`: o
 * `prompt()` é o One Tap, feito para aparecer sozinho, não para ser disparado
 * por clique. Quando o usuário fecha o One Tap no X, o navegador (FedCM) põe o
 * site de castigo — 2 h, depois 1 dia, 1 semana, 4 semanas — e nesse período
 * o prompt nem aparece e o GIS não avisa nada. A promise ficava pendurada, o
 * spinner girava para sempre, e nem F5 resolvia, porque o castigo é do
 * navegador. O botão renderizado abre o popup de login do Google, que não tem
 * castigo; se o usuário fechar o popup, simplesmente nada acontece e a tela
 * continua como estava — não há estado de carregamento para travar.
 */
export const renderGoogleButton = async (
  parent: HTMLElement,
  onCredential: (idToken: string) => void,
): Promise<() => void> => {
  await loadGsiScript();

  const gsi = window.google?.accounts?.id;
  if (!gsi) throw new Error('Google Sign-In indisponível.');

  if (!gsiInitialized) {
    gsi.initialize({
      client_id: WEB_CLIENT_ID,
      callback: (response) => {
        if (response.credential) credentialHandler?.(response.credential);
      },
      auto_select: false,
    });
    gsiInitialized = true;
  }

  credentialHandler = onCredential;

  // O GIS só aceita largura em px; acompanhamos a do formulário.
  const width = Math.min(
    BUTTON_MAX_WIDTH,
    Math.max(BUTTON_MIN_WIDTH, Math.floor(parent.clientWidth)),
  );

  gsi.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    width,
    locale: 'pt-BR',
  });

  return () => {
    // Na transição entre login e cadastro as duas telas ficam montadas por um
    // instante: a que sai não pode desligar o handler da que entrou.
    if (credentialHandler === onCredential) credentialHandler = null;
  };
};

export const useGoogleSignIn = () => {
  const auth = useAuthStore();
  const toast = useToast();
  const router = useRouter();
  const route = useRoute();
  const loading = ref(false);

  /** True quando não há client ID — a UI esconde o botão nesse caso. */
  const notConfigured = WEB_CLIENT_ID.length === 0;

  /**
   * Troca o `id_token` entregue pelo botão do Google por uma sessão nossa.
   *
   * O `loading` só liga aqui, quando o Google JÁ devolveu a credencial — o
   * popup de escolha de conta não passa por este código, então fechá-lo não
   * deixa nada pendurado.
   */
  const signInWithGoogle = async (idToken: string): Promise<void> => {
    loading.value = true;
    try {
      await auth.signInWithGoogle(idToken);

      /**
       * Navegar faz parte do login, e é aqui que ele precisa acontecer: o
       * botão do Google entrega o token direto para esta função, então a view
       * não tem onde encaixar o redirect como faz no fluxo de email/senha. Sem
       * isto, a sessão era gravada e o usuário continuava parado na tela de
       * login — só o F5 o levava adiante, empurrado pelo guard de `guestOnly`.
       *
       * `replace` (e não `push`) para o login não voltar no botão "voltar" do
       * navegador; `consumirRedirect` retoma o destino que o guard salvou —
       * inclusive vindo da tela de cadastro, que não tem a query.
       */
      const redirect = await consumirRedirect(route.query.redirect);
      await router.replace(redirect ?? { name: 'home' });
    } catch (err) {
      toast.error('Não foi possível entrar', extractErrorMessage(err));
    } finally {
      loading.value = false;
    }
  };

  return { signInWithGoogle, loading, notConfigured };
};
