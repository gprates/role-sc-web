import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { useAuthStore } from '@/stores/auth.store';
import { usePasswordResetStore } from '@/stores/passwordReset.store';
import { salvarRedirectPendente } from '@/utils/redirect';

/**
 * Rotas do site — espelham a árvore de navegação do app mobile:
 *
 *   RootNavigator (decide pelo token)
 *   ├── AuthNavigator  → /login, /cadastro, /verificar-email, /recuperar-senha,
 *   │                    /confirmar-codigo, /redefinir-senha
 *   └── AppNavigator   → /, /evento/:id, /favoritos, /perfil, /perfil/editar,
 *                        /perfil/senha
 *
 * `meta.requiresAuth` reproduz o gate do RootNavigator; `meta.guestOnly`
 * impede que um usuário já logado caia numa tela de login.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/eventos/HomeView.vue'),
        meta: { title: 'Eventos' },
      },
      {
        path: 'evento/:id',
        name: 'detalhe-evento',
        component: () => import('@/views/eventos/DetalheEventoView.vue'),
        props: true,
        meta: { title: 'Evento' },
      },
      {
        path: 'favoritos',
        name: 'favoritos',
        component: () => import('@/views/favoritos/FavoritosView.vue'),
        meta: { title: 'Favoritos' },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: () => import('@/views/perfil/PerfilView.vue'),
        meta: { title: 'Meu perfil' },
      },
      {
        path: 'perfil/editar',
        name: 'editar-perfil',
        component: () => import('@/views/perfil/EditarPerfilView.vue'),
        meta: { title: 'Editar perfil' },
      },
      {
        path: 'perfil/senha',
        name: 'alterar-senha',
        component: () => import('@/views/perfil/AlterarSenhaView.vue'),
        meta: { title: 'Alterar senha' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: { title: 'Entrar' },
      },
      {
        path: 'cadastro',
        name: 'cadastro',
        component: () => import('@/views/auth/CadastroView.vue'),
        meta: { title: 'Criar conta' },
      },
      {
        path: 'verificar-email',
        name: 'verificar-email',
        component: () => import('@/views/auth/VerificarEmailView.vue'),
        meta: { title: 'Verifique seu email' },
      },
      {
        path: 'recuperar-senha',
        name: 'recuperar-senha',
        component: () => import('@/views/auth/RecuperarSenhaView.vue'),
        meta: { title: 'Recuperar senha' },
      },
      {
        path: 'confirmar-codigo',
        name: 'confirmar-codigo',
        component: () => import('@/views/auth/ConfirmarCodigoView.vue'),
        meta: { title: 'Confirmar código' },
      },
      {
        path: 'redefinir-senha',
        name: 'redefinir-senha',
        component: () => import('@/views/auth/RedefinirSenhaView.vue'),
        meta: { title: 'Nova senha', requiresResetToken: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'nao-encontrado',
    component: () => import('@/views/NaoEncontradoView.vue'),
    meta: { title: 'Página não encontrada' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // Voltar no navegador restaura a posição — importante numa lista com
    // scroll infinito, senão o usuário volta para o topo e perde o lugar.
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Guarda o destino para retomar depois do login. A Home é o destino padrão,
    // não precisa ser lembrada. O storage cobre quem ainda vai criar conta.
    if (to.name === 'home') return { name: 'login' };
    void salvarRedirectPendente(to.fullPath);
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' };
  }

  // A tela de nova senha só existe dentro do fluxo de recuperação: sem o
  // resetToken em memória (ex.: F5 na página) não há o que redefinir.
  if (to.meta.requiresResetToken) {
    const reset = usePasswordResetStore();
    if (!reset.resetToken || !reset.email) {
      return { name: 'recuperar-senha' };
    }
  }

  return true;
});

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined;
  document.title = pageTitle ? `${pageTitle} · Rolê SC` : 'Rolê SC';
});
