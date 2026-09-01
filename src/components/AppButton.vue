<script setup lang="ts">
import { computed } from 'vue';

/**
 * Botão padrão — porte do `Button.tsx` do app mobile.
 * A variante `primary` usa o gradiente azul da identidade.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const props = withDefaults(
  defineProps<{
    label: string;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit';
  }>(),
  {
    variant: 'primary',
    loading: false,
    disabled: false,
    fullWidth: true,
    type: 'button',
  },
);

defineEmits<{ click: [MouseEvent] }>();

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <button
    :type="props.type"
    class="btn"
    :class="[`btn--${props.variant}`, { 'btn--full': props.fullWidth }]"
    :disabled="isDisabled"
    :aria-busy="props.loading"
    @click="$emit('click', $event)"
  >
    <span v-if="props.loading" class="btn__spinner" aria-hidden="true" />
    <template v-else>
      <slot name="icon-left" />
      <span class="btn__label">{{ props.label }}</span>
      <slot name="icon-right" />
    </template>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  min-height: 52px;
  padding-inline: var(--space-lg);
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
  transition:
    opacity 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

.btn--full {
  width: 100%;
}

.btn:not(:disabled):hover {
  opacity: 0.92;
}

.btn:not(:disabled):active {
  transform: scale(0.99);
  opacity: 0.85;
}

.btn:disabled {
  opacity: 0.45;
}

.btn--primary {
  background: var(--gradient-primary);
  color: var(--text-on-primary);
  box-shadow: var(--shadow-md);
}

.btn--secondary {
  background: var(--surface);
  color: var(--primary);
  border-color: var(--border-strong);
}

.btn--ghost {
  background: transparent;
  color: var(--primary);
  min-height: 44px;
  box-shadow: none;
}

.btn--danger {
  background: var(--surface);
  color: var(--danger);
}

.btn__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Equivalente do <ActivityIndicator> do React Native. */
.btn__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
