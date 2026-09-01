<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppInput from '@/components/AppInput.vue';
import GoogleSignInButton from '@/components/GoogleSignInButton.vue';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import { useGoogleSignIn } from '@/composables/useGoogleSignIn';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { validatePassword } from '@/utils/password';

/** T02 — Cadastro (porte de CadastroScreen.tsx). */
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const {
  signInWithGoogle,
  loading: googleLoading,
  notConfigured: googleNotConfigured,
} = useGoogleSignIn();

const nome = ref('');
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const senha = ref('');
const confirmarSenha = ref('');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (): string | null => {
  if (nome.value.trim().length < 2) return 'Informe seu nome completo.';
  if (!EMAIL_REGEX.test(email.value.trim())) return 'Informe um email válido.';
  if (!validatePassword(senha.value).isValid) {
    return 'A senha precisa cumprir todos os requisitos abaixo.';
  }
  if (senha.value !== confirmarSenha.value) return 'As senhas não coincidem.';
  return null;
};

const handleSubmit = async () => {
  const error = validate();
  if (error) {
    toast.error('Atenção', error);
    return;
  }

  const emailNormalizado = email.value.trim().toLowerCase();
  try {
    await auth.signUp(nome.value.trim(), emailNormalizado, senha.value);
    // O backend NÃO loga automaticamente: exige verificação de email (RN07).
    await router.push({ name: 'verificar-email', query: { email: emailNormalizado } });
  } catch (err) {
    toast.error('Não foi possível criar a conta', extractErrorMessage(err));
  }
};
</script>

<template>
  <div class="cadastro">
    <RouterLink :to="{ name: 'login' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar</span>
    </RouterLink>

    <header class="cadastro__header">
      <h1 class="t-display">Criar conta</h1>
      <p class="cadastro__subtitle t-body">
        Junte-se ao Rolê SC e descubra tudo o que rola por perto.
      </p>
    </header>

    <form class="cadastro__form" @submit.prevent="handleSubmit">
      <template v-if="!googleNotConfigured">
        <GoogleSignInButton
          :loading="googleLoading"
          :disabled="auth.submitting"
          @click="signInWithGoogle"
        />
        <div class="cadastro__divider">
          <span class="cadastro__divider-line" />
          <span class="t-micro">OU</span>
          <span class="cadastro__divider-line" />
        </div>
      </template>

      <AppInput
        v-model="nome"
        icon="person-outline"
        placeholder="Nome completo"
        autocomplete="name"
        aria-label="Nome completo"
      />

      <AppInput
        v-model="email"
        icon="mail-outline"
        placeholder="seu@email.com"
        type="email"
        inputmode="email"
        autocomplete="email"
        aria-label="Email"
      />

      <AppInput
        v-model="senha"
        icon="lock-closed-outline"
        placeholder="Senha"
        is-password
        autocomplete="new-password"
        aria-label="Senha"
      />

      <PasswordStrengthMeter :password="senha" />

      <AppInput
        v-model="confirmarSenha"
        icon="lock-closed-outline"
        placeholder="Confirmar senha"
        is-password
        autocomplete="new-password"
        aria-label="Confirmar senha"
        @submit="handleSubmit"
      />

      <AppButton
        label="Criar conta"
        type="submit"
        :loading="auth.submitting"
        class="cadastro__submit"
      />

      <p class="cadastro__bottom t-body">
        Já tem conta?
        <RouterLink :to="{ name: 'login' }" class="t-body-bold">Entrar</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.cadastro {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  color: var(--text-secondary);
}

.cadastro__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cadastro__subtitle {
  color: var(--text-secondary);
}

.cadastro__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.cadastro__divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-muted);
}

.cadastro__divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.cadastro__submit {
  margin-top: var(--space-xs);
}

.cadastro__bottom {
  margin-top: var(--space-xs);
  text-align: center;
  color: var(--text-secondary);
}
</style>
