<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppInput from '@/components/AppInput.vue';
import AppLogo from '@/components/AppLogo.vue';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import { useGoogleSignIn } from '@/composables/useGoogleSignIn';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { getApiErrorCode } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { API_ERROR_CODES } from '@/types';
import { consumirRedirect } from '@/utils/redirect';

/** T01 — Login (porte de LoginScreen.tsx). */
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const {
  signInWithGoogle,
  loading: googleLoading,
  notConfigured: googleNotConfigured,
} = useGoogleSignIn();

const email = ref('');
const senha = ref('');

const handleSubmit = async () => {
  if (!email.value.trim() || !senha.value) {
    toast.error('Campos obrigatórios', 'Preencha email e senha para entrar.');
    return;
  }

  const emailNormalizado = email.value.trim().toLowerCase();
  try {
    await auth.signIn(emailNormalizado, senha.value);
    // Retoma o destino que o guard guardou (query ou, após cadastro, storage).
    const redirect = await consumirRedirect(route.query.redirect);
    await router.replace(redirect ?? { name: 'home' });
  } catch (err) {
    // Caso especial: 403 com code EMAIL_NOT_VERIFIED significa que a conta
    // existe mas o email não foi confirmado (RN07). Em vez de um erro genérico,
    // levamos o usuário para a tela de verificação, que oferece o reenvio.
    if (getApiErrorCode(err) === API_ERROR_CODES.EMAIL_NOT_VERIFIED) {
      await router.push({
        name: 'verificar-email',
        query: { email: emailNormalizado },
      });
      return;
    }
    toast.error('Não foi possível entrar', extractErrorMessage(err));
  }
};
</script>

<template>
  <div class="login">
    <header class="login__header">
      <AppLogo :size="140" />
      <h1 class="login__title t-display">Rolê SC</h1>
      <p class="login__subtitle t-body">Eventos do litoral catarinense</p>
    </header>

    <form class="login__form" @submit.prevent="handleSubmit">
      <AppInput
        v-model="email"
        icon="mail-outline"
        placeholder="seu@email.com"
        type="email"
        inputmode="email"
        autocomplete="email"
        aria-label="Email"
        @submit="handleSubmit"
      />

      <AppInput
        v-model="senha"
        icon="lock-closed-outline"
        placeholder="Senha"
        is-password
        autocomplete="current-password"
        aria-label="Senha"
        @submit="handleSubmit"
      />

      <RouterLink :to="{ name: 'recuperar-senha' }" class="login__forgot t-body-bold">
        Esqueci minha senha
      </RouterLink>

      <AppButton label="Entrar" type="submit" :loading="auth.submitting" />

      <template v-if="!googleNotConfigured">
        <div class="login__divider">
          <span class="login__divider-line" />
          <span class="t-micro">OU</span>
          <span class="login__divider-line" />
        </div>

        <GoogleSignInButton
          :loading="googleLoading"
          :disabled="auth.submitting"
          @click="signInWithGoogle"
        />
      </template>

      <p class="login__bottom t-body">
        Novo por aqui?
        <RouterLink :to="{ name: 'cadastro' }" class="t-body-bold">Criar conta</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxl);
}

.login__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.login__title {
  margin-top: var(--space-sm);
  color: var(--primary);
}

.login__subtitle {
  color: var(--text-secondary);
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.login__forgot {
  align-self: flex-end;
  margin-block: calc(-1 * var(--space-xs));
}

.login__divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  color: var(--text-muted);
}

.login__divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.login__bottom {
  margin-top: var(--space-xs);
  text-align: center;
  color: var(--text-secondary);
}
</style>
