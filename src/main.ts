import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';

import './styles/global.css';

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
  app.mount('#app');
});
