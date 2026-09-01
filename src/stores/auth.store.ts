import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { setUnauthorizedHandler } from '@/services/api';
import { authService } from '@/services/auth.service';
import type { UserPublic } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { storage } from '@/utils/storage';

/**
 * Estado global de autenticação — equivalente ao AuthContext do app mobile.
 *
 * `bootstrapping` cobre a janela entre o carregamento da página e a leitura do
 * localStorage. Sem ele, o guard do router veria `token === null` no primeiro
 * tick e chutaria um usuário logado para a tela de login a cada F5.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserPublic | null>(null);
  const token = ref<string | null>(null);
  const bootstrapping = ref(true);
  const submitting = ref(false);

  const isAuthenticated = computed(() => token.value !== null);

  const signOut = async (): Promise<void> => {
    await storage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
    token.value = null;
    user.value = null;
  };

  /**
   * Restaura a sessão do localStorage. Chamado uma vez em main.ts, antes de
   * montar o app, para que o primeiro render já saiba se há sessão.
   */
  const bootstrap = async (): Promise<void> => {
    const [storedToken, storedUser] = await Promise.all([
      storage.get<string>(STORAGE_KEYS.token),
      storage.get<UserPublic>(STORAGE_KEYS.user),
    ]);
    if (storedToken) token.value = storedToken;
    if (storedUser) user.value = storedUser;
    bootstrapping.value = false;

    // 401 vindo do backend (JWT expirado, RN09) derruba a sessão.
    setUnauthorizedHandler(() => {
      void signOut();
    });
  };

  const persistSession = async (newToken: string, newUser: UserPublic) => {
    await storage.set(STORAGE_KEYS.token, newToken);
    await storage.set(STORAGE_KEYS.user, newUser);
    token.value = newToken;
    user.value = newUser;
  };

  const signIn = async (email: string, senha: string): Promise<void> => {
    submitting.value = true;
    try {
      const res = await authService.login({ email, senha });
      await persistSession(res.token, res.user);
    } finally {
      submitting.value = false;
    }
  };

  /**
   * Cria a conta no backend.
   *
   * IMPORTANTE: NÃO loga automaticamente. O backend exige verificação de email
   * antes de liberar o login (RN07) — quem chamar deve levar o usuário para a
   * tela de verificação.
   */
  const signUp = async (nome: string, email: string, senha: string): Promise<void> => {
    submitting.value = true;
    try {
      await authService.register({ nome, email, senha });
    } finally {
      submitting.value = false;
    }
  };

  const signInWithGoogle = async (googleIdToken: string): Promise<void> => {
    submitting.value = true;
    try {
      const res = await authService.googleLogin(googleIdToken);
      await persistSession(res.token, res.user);
    } finally {
      submitting.value = false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const res = await authService.getMe();
      await storage.set(STORAGE_KEYS.user, res.user);
      user.value = res.user;
    } catch (err) {
      console.warn('[auth.refreshUser] falhou', err);
    }
  };

  /**
   * Aplica um patch parcial no user e persiste. Usado quando uma operação
   * atualiza só um pedaço — ex.: upload de avatar só mexe em `avatarUrl`,
   * sem precisar de um getMe inteiro.
   */
  const patchUser = async (patch: Partial<UserPublic>): Promise<void> => {
    if (!user.value) return;
    const updated = { ...user.value, ...patch };
    user.value = updated;
    await storage.set(STORAGE_KEYS.user, updated);
  };

  return {
    user,
    token,
    bootstrapping,
    submitting,
    isAuthenticated,
    bootstrap,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
    patchUser,
  };
});
