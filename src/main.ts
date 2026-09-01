import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth.store';
import { useFavoritosStore } from './stores/favoritos.store';

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
 */
const auth = useAuthStore(pinia);
const favoritos = useFavoritosStore(pinia);

void Promise.all([auth.bootstrap(), favoritos.refresh()]).finally(() => {
  app.use(router);
  app.mount('#app');
});
