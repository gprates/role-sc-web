import Clarity from '@microsoft/clarity';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import { setUnauthorizedHandler } from './services/api';
import { useAuthStore } from './stores/auth.store';
import { salvarRedirectPendente } from './utils/redirect';

import './styles/global.css';

/**
 * Microsoft Clarity (heatmaps e gravação de sessão).
 *
 * Só liga quando `VITE_CLARITY_PROJECT_ID` tem valor; vazio, nenhum script é
 * carregado. Fica aqui, no bootstrap, para ser iniciado uma única vez. O ID é
 * público (vai no bundle), como o Client ID do Google.
 */
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() ?? '';
if (CLARITY_PROJECT_ID) Clarity.init(CLARITY_PROJECT_ID);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

/**
 * A sessão é restaurada ANTES de registrar o router.
 *
 * O `beforeEach` lê `auth.isAuthenticated` já na primeira navegação. Se o
 * localStorage ainda não tivesse sido lido nesse momento, todo F5 numa página
 * protegida chutaria o usuário logado de volta para o login.
 *
 * Os favoritos NÃO são carregados aqui. Eles agora vêm da API e pertencem ao
 * usuário do token, então o store se carrega sozinho quando o token aparece
 * (ver o `watch` em favoritos.store) — buscá-los neste ponto daria 401, porque
 * a sessão ainda nem foi lida.
 */
const auth = useAuthStore(pinia);

void auth.bootstrap().finally(() => {
  app.use(router);

  /**
   * 401 do backend (JWT expirado ou inválido, RN09).
   *
   * Antes isto só fazia signOut, e a tela que disparou a request ficava no ar
   * mostrando "Token inválido" — sem sessão, sem botão de entrar, sem saída.
   * Era o que acontecia com quem abria um link compartilhado de evento no
   * celular com uma sessão antiga guardada: o guard deixava passar (havia
   * token), a request falhava, e a viagem terminava ali.
   *
   * Agora a sessão cai E o usuário vai para o login, com o destino guardado
   * nos dois lugares que `consumirRedirect` conhece (query + localStorage),
   * para voltar ao evento assim que autenticar.
   *
   * O `redirecionando` existe porque uma tela dispara várias requests em
   * paralelo (evento, comentários, favoritos): todas tomam 401 juntas e só a
   * primeira deve comandar a navegação.
   */
  let redirecionando = false;

  setUnauthorizedHandler(() => {
    if (redirecionando) return;
    redirecionando = true;

    const destino = router.currentRoute.value;

    void (async () => {
      try {
        await auth.signOut();

        if (destino.name === 'login') return;

        // A Home é o destino padrão pós-login; não precisa ser lembrada.
        const lembrar = Boolean(destino.meta.requiresAuth) && destino.name !== 'home';
        if (lembrar) await salvarRedirectPendente(destino.fullPath);

        await router.replace({
          name: 'login',
          query: lembrar ? { redirect: destino.fullPath } : {},
        });
      } finally {
        redirecionando = false;
      }
    })();
  });

  app.mount('#app');
});
