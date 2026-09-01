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
import { API_ERROR_CODES } from '@/types';
import { validatePassword } from '@/utils/password';

/**
 * T13 — Alterar senha do usuário logado (porte de AlterarSenhaScreen.tsx).
 *
 * Exige a senha atual como prova de identidade — defesa contra um JWT vazado
 * (RN20). Não força re-login depois do sucesso (decisão de UX do contrato).
 */
const router = useRouter();
const toast = useToast();

const senhaAtual = ref('');
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
const senhaIgualAtual = computed(
  () =>
    senhaAtual.value.length > 0 &&
    novaSenha.value.length > 0 &&
    novaSenha.value === senhaAtual.value,
);

const submitDisabled = computed(
  () =>
    submitting.value ||
    senhaAtual.value.length === 0 ||
    !strength.value.isValid ||
    novaSenha.value !== confirmarSenha.value ||
    senhaIgualAtual.value,
);

const handleSave = async () => {
  if (senhaAtual.value.length === 0) {
    toast.error('Atenção', 'Informe sua senha atual.');
    return;
  }
  if (!strength.value.isValid) {
    toast.error('Senha fraca', 'A nova senha precisa cumprir todos os requisitos abaixo.');
    return;
  }
  if (novaSenha.value !== confirmarSenha.value) {
    toast.error('Atenção', 'As senhas não coincidem.');
    return;
  }
  if (senhaIgualAtual.value) {
    toast.error('Atenção', 'A nova senha precisa ser diferente da senha atual.');
    return;
  }

  submitting.value = true;
  try {
    await authService.changePassword(senhaAtual.value, novaSenha.value);
    toast.success('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    await router.push({ name: 'perfil' });
  } catch (err) {
    if (getApiErrorCode(err) === API_ERROR_CODES.INVALID_CURRENT_PASSWORD) {
      toast.error('Senha incorreta', 'A senha atual está incorreta. Tente novamente.');
      senhaAtual.value = '';
      return;
    }
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="alterar content-shell">
    <RouterLink :to="{ name: 'perfil' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar</span>
    </RouterLink>

    <header class="alterar__header">
      <h1 class="t-display">Alterar senha</h1>
      <p class="alterar__subtitle t-body">
        Para sua segurança, confirme sua senha atual antes de definir uma nova.
      </p>
    </header>

    <form class="alterar__form" @submit.prevent="handleSave">
      <AppInput
        v-model="senhaAtual"
        icon="lock-closed-outline"
        placeholder="Senha atual"
        is-password
        autocomplete="current-password"
        aria-label="Senha atual"
      />

      <AppInput
        v-model="novaSenha"
        icon="lock-closed-outline"
        placeholder="Nova senha"
        is-password
        autocomplete="new-password"
        aria-label="Nova senha"
      />

      <PasswordStrengthMeter :password="novaSenha" />

      <p v-if="senhaIgualAtual" class="match match--error t-caption">
        <AppIcon name="alert-circle" :size="16" />
        <span>A nova senha precisa ser diferente da atual.</span>
      </p>

      <AppInput
        v-model="confirmarSenha"
        icon="lock-closed-outline"
        placeholder="Confirmar nova senha"
        is-password
        autocomplete="new-password"
        aria-label="Confirmar nova senha"
        @submit="handleSave"
      />

      <p v-if="senhasIguais && !senhaIgualAtual" class="match match--ok t-caption">
        <AppIcon name="checkmark-circle" :size="16" />
        <span>As senhas conferem.</span>
      </p>

      <p v-if="senhasDiferentes" class="match match--error t-caption">
        <AppIcon name="alert-circle" :size="16" />
        <span>As senhas não coincidem.</span>
      </p>

      <AppButton
        label="Salvar nova senha"
        type="submit"
        :loading="submitting"
        :disabled="submitDisabled"
        class="alterar__submit"
      />
    </form>
  </div>
</template>

<style scoped>
.alterar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-md);
  max-width: 560px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  color: var(--text-secondary);
}

.alterar__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.alterar__subtitle {
  color: var(--text-secondary);
}

.alterar__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-xs);
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

.alterar__submit {
  margin-top: var(--space-xs);
}
</style>
