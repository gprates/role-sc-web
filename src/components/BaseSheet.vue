<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useConfirm } from '@/composables/useConfirm';

import AppIcon from './AppIcon.vue';

/**
 * Bottom sheet reutilizável — a casca dos modais de filtro.
 *
 * No mobile cada modal repete o `<Modal>` + backdrop + handle do React Native.
 * Aqui isso vive num componente só, porque na web ainda somam-se três coisas
 * que o RN resolve sozinho e que erram fácil quando copiadas três vezes:
 * fechar no Esc, travar o scroll do fundo, e prender o Tab dentro do sheet.
 *
 * Acima de 768px o sheet vira um diálogo centrado — uma folha colada no rodapé
 * de um monitor não faz sentido. Mesma decisão do ComentariosModal.
 */
const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();

const sheet = ref<HTMLElement | null>(null);
const titleId = `sheet-title-${Math.random().toString(36).slice(2, 9)}`;

/**
 * O ConfirmDialog pode abrir POR CIMA de um sheet (excluir um comentário, por
 * exemplo). Os dois escutam Esc no window, e o sheet registrou primeiro — sem
 * esta checagem um único Esc responderia "cancelar" ao diálogo E fecharia o
 * sheet atrás dele, levando embora a lista que o usuário estava lendo.
 */
const { pending: confirmPending } = useConfirm();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (!confirmPending.value) emit('close');
    return;
  }

  // Focus trap. Sem isso o Tab passeia pelos cards atrás do overlay: eles
  // continuam no DOM e continuam focáveis, mesmo escondidos pelo backdrop.
  if (event.key !== 'Tab' || !sheet.value) return;
  const items = Array.from(sheet.value.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) return;

  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

/** Devolve o foco a quem abriu o sheet quando ele fecha. */
let lastFocused: HTMLElement | null = null;

watch(
  () => props.open,
  async (open) => {
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      lastFocused = document.activeElement as HTMLElement | null;
      window.addEventListener('keydown', onKeydown);
      await nextTick();
      sheet.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    } else {
      window.removeEventListener('keydown', onKeydown);
      lastFocused?.focus();
      lastFocused = null;
    }
  },
);

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="props.open"
        class="backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="emit('close')"
      >
        <div ref="sheet" class="sheet">
          <span class="sheet__handle" aria-hidden="true" />

          <header class="sheet__head">
            <h2 :id="titleId" class="t-title">{{ props.title }}</h2>
            <button
              type="button"
              class="sheet__close"
              :aria-label="`Fechar ${props.title}`"
              @click="emit('close')"
            >
              <AppIcon name="close" :size="22" color="var(--text-secondary)" />
            </button>
          </header>

          <slot />

          <footer v-if="$slots.footer" class="sheet__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--overlay);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 80dvh;
  padding-top: var(--space-sm);
  padding-bottom: var(--space-lg);
  background: var(--background);
  border-radius: var(--radius-xxl) var(--radius-xxl) 0 0;
}

@media (min-width: 768px) {
  .backdrop {
    align-items: center;
  }

  .sheet {
    max-width: 520px;
    max-height: 70dvh;
    border-radius: var(--radius-xxl);
    box-shadow: var(--shadow-xl);
  }

  .sheet__handle {
    display: none;
  }
}

.sheet__handle {
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin-bottom: var(--space-sm);
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: 0 var(--space-xl) var(--space-sm);
}

.sheet__close {
  display: flex;
  flex: none;
  padding: var(--space-xxs);
  margin: calc(-1 * var(--space-xxs));
}

.sheet__foot {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-xl) 0;
  border-top: 1px solid var(--border);
}

.sheet__foot > * {
  flex: 1;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.22s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(24px);
}
</style>
