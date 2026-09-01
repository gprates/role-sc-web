<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppInput from '@/components/AppInput.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { authService, getApiErrorCode } from '@/services/auth.service';
import { usePasswordResetStore } from '@/stores/passwordReset.store';
import { API_ERROR_CODES } from '@/types';

/**
 * T04 — Recuperar senha, etapa 1 de 3 (porte de RecuperarSenhaScreen.tsx).
 *
 * Dispara POST /auth/forgot-password e segue para a confirmação do código.
 * Erro 404 USER_NOT_FOUND vira um convite para criar conta com o email digitado
 * (o backend retorna 404 explícito aqui por decisão de produto — RN23).
 */
const router = useRouter();
const toast = useToast();
const { confirm } = useConfirm();
const resetStore = usePasswordResetStore();

const email = ref('');
const submitting = ref(false);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleSubmit = async () => {
  if (!EMAIL_REGEX.test(email.value.trim())) {
    toast.error('Atenção', 'Informe um email válido.');
    return;
  }

  const emailNormalizado = email.value.trim().toLowerCase();
  submitting.value = true;
  try {
    await authService.forgotPassword(emailNormalizado);
    resetStore.start(emailNormalizado);
    await router.push({
      name: 'confirmar-codigo',
      query: { email: emailNormalizado },
    });
  } catch (err) {
    if (getApiErrorCode(err) === API_ERROR_CODES.USER_NOT_FOUND) {
      const criar = await confirm({
        title: 'Email não encontrado',
        message: 'Não encontramos uma conta com esse email. Quer criar uma?',
        confirmLabel: 'Criar conta',
        cancelLabel: 'Tentar outro email',
      });
      if (criar) {
        await router.push({ name: 'cadastro', query: { email: emailNormalizado } });
      }
      return;
    }
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="recuperar">
    <RouterLink :to="{ name: 'login' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar ao login</span>
    </RouterLink>

    <header class="recuperar__header">
      <h1 class="t-display">Recuperar senha</h1>
      <p class="recuperar__subtitle t-body">
        Vamos enviar um código de 6 dígitos para o seu email.
      </p>
    </header>

    <form class="recuperar__form" @submit.prevent="handleSubmit">
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
      <AppButton label="Enviar código" type="submit" :loading="submitting" />
    </form>
  </div>
</template>

<style scoped>
.recuperar {
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

.recuperar__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.recuperar__subtitle {
  color: var(--text-secondary);
}

.recuperar__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
