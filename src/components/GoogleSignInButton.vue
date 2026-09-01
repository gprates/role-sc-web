<script setup lang="ts">
import AppIcon from './AppIcon.vue';

/**
 * Botão "Continuar com Google".
 *
 * Fora da v1 do site: fica oculto enquanto `VITE_GOOGLE_WEB_CLIENT_ID` estiver
 * vazio (ver `useGoogleSignIn`). O visual segue o guideline do Google (fundo
 * branco, texto cinza escuro) com a mesma proporção do botão do app mobile.
 */
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    label?: string;
  }>(),
  { loading: false, disabled: false, label: 'Continuar com Google' },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="google-btn"
    :disabled="disabled || loading"
    :aria-label="label"
    :aria-busy="loading"
    @click="$emit('click')"
  >
    <span class="google-btn__icon">
      <span v-if="loading" class="google-btn__spinner" aria-hidden="true" />
      <AppIcon v-else name="logo-google" :size="20" color="#4285F4" />
    </span>
    <span class="google-btn__label">{{ label }}</span>
    <!-- Espelho do ícone, para manter o texto opticamente centralizado. -->
    <span class="google-btn__icon" aria-hidden="true" />
  </button>
</template>

<style scoped>
.google-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 52px;
  padding-inline: var(--space-md);
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  transition: opacity 0.15s ease;
}

.google-btn:not(:disabled):hover {
  opacity: 0.9;
}

.google-btn:disabled {
  opacity: 0.5;
}

.google-btn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
}

.google-btn__label {
  flex: 1;
  text-align: center;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
  color: #3c4043;
}

.google-btn__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #3c4043;
  border-top-color: transparent;
  border-radius: 50%;
  animation: google-spin 0.7s linear infinite;
}

@keyframes google-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
