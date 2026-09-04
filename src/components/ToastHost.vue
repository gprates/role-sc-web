<script setup lang="ts">
import { useToast, type ToastVariant } from '@/composables/useToast';

import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Renderiza a fila de toasts. Montado uma única vez no App.vue.
 *
 * É o substituto do `Alert.alert` informativo do React Native: no mobile o
 * alert é modal e bloqueia a tela; na web um toast que some sozinho é a
 * convenção — não interrompe o que o usuário está fazendo.
 */
const { toasts, dismiss } = useToast();

const ICONS: Record<ToastVariant, IconName> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle',
  error: 'alert-circle',
};
</script>

<template>
  <div class="toasts" role="region" aria-label="Notificações">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.variant}`"
        role="status"
        aria-live="polite"
      >
        <AppIcon :name="ICONS[toast.variant]" :size="20" class="toast__icon" />
        <div class="toast__content">
          <p class="toast__title">{{ toast.title }}</p>
          <p v-if="toast.message" class="toast__message">{{ toast.message }}</p>
        </div>
        <button
          type="button"
          class="toast__close"
          aria-label="Fechar notificação"
          @click="dismiss(toast.id)"
        >
          <AppIcon name="close" :size="18" color="var(--text-muted)" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  z-index: var(--z-toast);
  left: var(--space-md);
  right: var(--space-md);
  /* No mobile fica acima da tab bar flutuante para não cobri-la. */
  bottom: calc(var(--tabbar-height) + var(--space-md));
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  pointer-events: none;
}

@media (min-width: 768px) {
  .toasts {
    left: auto;
    bottom: var(--space-xl);
    right: var(--space-xl);
    width: min(400px, calc(100vw - 2 * var(--space-xl)));
  }
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--info);
  box-shadow: var(--shadow-xl);
  pointer-events: auto;
}

.toast--success {
  border-left-color: var(--success);
}
.toast--error {
  border-left-color: var(--danger);
}

.toast--info .toast__icon {
  color: var(--info);
}
.toast--success .toast__icon {
  color: var(--success);
}
.toast--error .toast__icon {
  color: var(--danger);
}

.toast__icon {
  margin-top: 2px;
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
  color: var(--text-primary);
}

.toast__message {
  margin-top: 2px;
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  color: var(--text-secondary);
}

.toast__close {
  display: flex;
  padding: 2px;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
