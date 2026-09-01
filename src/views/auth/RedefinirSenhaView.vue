<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppInput from '@/components/AppInput.vue';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { authService, getApiErrorCode } from '@/services/auth.service';
import { usePasswordResetStore } from '@/stores/passwordReset.store';
import { API_ERROR_CODES } from '@/types';
import { validatePassword } from '@/utils/password';

/**
 * T06 — Recuperar senha, etapa 3 de 3 (porte de RedefinirSenhaScreen.tsx).
 *
 * O guard do router já garante que `email` e `resetToken` existem no store —
 * sem eles esta rota redireciona para o início do fluxo.
 */
const router = useRouter();
const toast = useToast();
const resetStore = usePasswordResetStore();

const novaSenha = ref('');
const confirmarSenha = ref('');
const submitting = ref(false);

const strength = computed(() => validatePassword(novaSenha.value));
const senhasIguais = computed(
  () => confirmarSenha.value.length > 0 && novaSenha.value === confirmarSenha.value,
);
const senhasDiferentes = computed(
  () => confirmarSenha.value.length > 0 && novaSenha.value !== confirmarSenha.value,
);

const handleSubmit = async () => {
  if (!strength.value.isValid) {
    toast.error(
      'Senha fraca',
      'A senha precisa cumprir todos os requisitos antes de ser salva.',
    );
    return;
  }
  if (novaSenha.value !== confirmarSenha.value) {
    toast.error('Atenção', 'As senhas não coincidem.');
    return;
  }

  const email = resetStore.email;
  const resetToken = resetStore.resetToken;
  if (!email || !resetToken) {
    await router.replace({ name: 'recuperar-senha' });
    return;
  }

  submitting.value = true;
  try {
    await authService.resetPassword(email, resetToken, novaSenha.value);
    resetStore.clear();
    toast.success(
      'Senha redefinida',
      'Sua senha foi alterada com sucesso. Faça login com a nova senha.',
    );
    await router.replace({ name: 'login' });
  } catch (err) {
    if (getApiErrorCode(err) === API_ERROR_CODES.INVALID_RESET_TOKEN) {
      toast.error('Link expirado', 'O processo de recuperação expirou. Vamos recomeçar.');
      resetStore.clear();
      await router.replace({ name: 'recuperar-senha' });
      return;
    }
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="redefinir">
    <RouterLink :to="{ name: 'confirmar-codigo' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar</span>
    </RouterLink>

    <header class="redefinir__header">
      <h1 class="t-display">Nova senha</h1>
      <p class="redefinir__subtitle t-body">
        Escolha uma senha segura. Os requisitos abaixo precisam ser atendidos.
      </p>
    </header>

    <form class="redefinir__form" @submit.prevent="handleSubmit">
      <AppInput
        v-model="novaSenha"
        icon="lock-closed-outline"
        placeholder="Nova senha"
        is-password
        autocomplete="new-password"
        aria-label="Nova senha"
      />

      <PasswordStrengthMeter :password="novaSenha" />

      <AppInput
        v-model="confirmarSenha"
        icon="lock-closed-outline"
        placeholder="Confirmar nova senha"
        is-password
        autocomplete="new-password"
        aria-label="Confirmar nova senha"
        @submit="handleSubmit"
      />

      <p v-if="senhasIguais" class="match match--ok t-caption">
        <AppIcon name="checkmark-circle" :size="16" />
        <span>As senhas conferem.</span>
      </p>

      <p v-if="senhasDiferentes" class="match match--error t-caption">
        <AppIcon name="alert-circle" :size="16" />
        <span>As senhas não coincidem.</span>
      </p>

      <AppButton
        label="Redefinir senha"
        type="submit"
        :loading="submitting"
        :disabled="!strength.isValid || novaSenha !== confirmarSenha"
        class="redefinir__submit"
      />
    </form>
  </div>
</template>

<style scoped>
.redefinir {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  color: var(--text-secondary);
}

.redefinir__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.redefinir__subtitle {
  color: var(--text-secondary);
}

.redefinir__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.match {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: calc(-1 * var(--space-xs));
}

.match--ok {
  color: var(--success);
}

.match--error {
  color: var(--danger);
}

.redefinir__submit {
  margin-top: var(--space-xs);
}
</style>
