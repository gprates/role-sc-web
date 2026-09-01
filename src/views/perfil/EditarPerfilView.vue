<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppInput from '@/components/AppInput.vue';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

/**
 * T12 — Editar perfil (porte de EditarPerfilScreen.tsx).
 * Só o nome é editável; o email é imutável por decisão de produto (RN19).
 */
const NOME_MIN_LENGTH = 2;
const NOME_MAX_LENGTH = 80;

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const nome = ref(auth.user?.nome ?? '');
const submitting = ref(false);

const trimmedNome = computed(() => nome.value.trim());
const houveAlteracao = computed(() => trimmedNome.value !== (auth.user?.nome ?? ''));
const nomeValido = computed(
  () =>
    trimmedNome.value.length >= NOME_MIN_LENGTH &&
    trimmedNome.value.length <= NOME_MAX_LENGTH,
);

const handleSave = async () => {
  if (!nomeValido.value) {
    toast.error(
      'Nome inválido',
      `O nome deve ter entre ${NOME_MIN_LENGTH} e ${NOME_MAX_LENGTH} caracteres.`,
    );
    return;
  }
  if (!houveAlteracao.value) {
    router.back();
    return;
  }

  submitting.value = true;
  try {
    const res = await authService.updateProfile(trimmedNome.value);
    await auth.patchUser(res.user);
    toast.success('Perfil atualizado', 'Suas informações foram salvas.');
    await router.push({ name: 'perfil' });
  } catch (err) {
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="editar content-shell">
    <RouterLink :to="{ name: 'perfil' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar</span>
    </RouterLink>

    <header class="editar__header">
      <h1 class="t-display">Editar perfil</h1>
      <p class="editar__subtitle t-body">
        Atualize seu nome de exibição. Para alterar a foto, volte ao perfil e clique
        no avatar.
      </p>
    </header>

    <form class="editar__form" @submit.prevent="handleSave">
      <div>
        <label for="nome" class="field-label t-micro">NOME</label>
        <AppInput
          id="nome"
          v-model="nome"
          icon="person-outline"
          placeholder="Nome completo"
          autocomplete="name"
          :maxlength="NOME_MAX_LENGTH"
          @submit="handleSave"
        />
      </div>

      <div>
        <p class="field-label t-micro">EMAIL</p>
        <div class="readonly-field">
          <AppIcon name="mail-outline" :size="20" color="var(--text-muted)" />
          <span class="readonly-field__text clamp-1">{{ auth.user?.email ?? '—' }}</span>
          <AppIcon name="lock-closed" :size="14" color="var(--text-muted)" />
        </div>
        <p class="field-help t-caption">O email não pode ser alterado.</p>
      </div>

      <AppButton
        :label="houveAlteracao ? 'Salvar alterações' : 'Voltar'"
        type="submit"
        :loading="submitting"
        :disabled="!nomeValido"
        class="editar__submit"
      />
    </form>
  </div>
</template>

<style scoped>
.editar {
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

.editar__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.editar__subtitle {
  color: var(--text-secondary);
}

.editar__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-xs);
}

.field-label {
  display: block;
  margin-bottom: var(--space-xs);
  color: var(--text-muted);
}

.readonly-field {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 52px;
  padding-inline: var(--space-md);
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
}

.readonly-field__text {
  flex: 1;
  min-width: 0;
  color: var(--text-muted);
}

.field-help {
  margin-top: 4px;
  margin-left: var(--space-md);
  color: var(--text-muted);
}

.editar__submit {
  margin-top: var(--space-xs);
}
</style>
