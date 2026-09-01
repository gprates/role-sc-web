<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';

import { useConfirm } from '@/composables/useConfirm';

import AppButton from './AppButton.vue';

/**
 * Diálogo de confirmação — substitui o `Alert.alert` com botões do React
 * Native. Montado uma única vez no App.vue; o estado vem do `useConfirm`.
 */
const { pending, answer } = useConfirm();

/**
 * O Esc precisa ser escutado no window: um `@keydown` no backdrop nunca
 * dispararia, porque uma <div> sem tabindex não recebe foco.
 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') answer(false);
};

watch(pending, (value) => {
  if (value) window.addEventListener('keydown', onKeydown);
  else window.removeEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Transition name="dialog">
    <div
      v-if="pending"
      class="backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      @click.self="answer(false)"
    >
      <div class="dialog">
        <h2 id="confirm-title" class="dialog__title t-title">{{ pending.title }}</h2>
        <p v-if="pending.message" class="dialog__message t-body">
          {{ pending.message }}
        </p>

        <div class="dialog__actions">
          <AppButton
            :label="pending.cancelLabel ?? 'Cancelar'"
            variant="secondary"
            @click="answer(false)"
          />
          <AppButton
            :label="pending.confirmLabel ?? 'Confirmar'"
            :variant="pending.destructive ? 'danger' : 'primary'"
            @click="answer(true)"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--overlay);
  backdrop-filter: blur(2px);
}

.dialog {
  width: 100%;
  max-width: 420px;
  padding: var(--space-xl);
  background: var(--surface);
  border-radius: var(--radius-xxl);
  box-shadow: var(--shadow-xl);
}

.dialog__title {
  color: var(--text-primary);
}

.dialog__message {
  margin-top: var(--space-xs);
  color: var(--text-secondary);
}

.dialog__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-lg);
}

/* Em telas maiores os botões ficam lado a lado, com a ação primária à direita. */
@media (min-width: 480px) {
  .dialog__actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .dialog__actions > :deep(.btn) {
    width: auto;
    min-width: 130px;
  }
}

/* O botão "danger" é branco no mobile; num diálogo ele precisa de peso. */
.dialog__actions > :deep(.btn--danger) {
  background: var(--danger);
  color: var(--text-on-primary);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.18s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
