<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import AppIcon from './AppIcon.vue';

/**
 * Modal de comentários — stub, igual ao `ComentariosModal.tsx` do mobile.
 *
 * RF31 ainda não tem endpoint no backend, então a lista é mockada e o campo de
 * escrita fica desabilitado. Quando `POST /eventos/:id/comentarios` existir,
 * trocar por um composable `useComentarios`.
 */
interface Comentario {
  id: string;
  autor: string;
  texto: string;
  tempo: string;
}

const MOCK_COMENTARIOS: Comentario[] = [
  { id: '1', autor: 'Ana Beatriz', texto: 'Alguém vai? Adoraria companhia!', tempo: 'há 2h' },
  {
    id: '2',
    autor: 'Rafael Costa',
    texto: 'Esse ano promete ser incrível. Vou com a família.',
    tempo: 'há 5h',
  },
  { id: '3', autor: 'Julia', texto: 'Tem estacionamento no local?', tempo: 'há 1d' },
];

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const draft = ref('');

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close');
};

// Trava o scroll do fundo enquanto o modal está aberto e escuta o Esc.
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) window.addEventListener('keydown', onKeydown);
    else window.removeEventListener('keydown', onKeydown);
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
        aria-labelledby="comentarios-title"
        @click.self="emit('close')"
      >
        <div class="sheet">
          <span class="sheet__handle" aria-hidden="true" />

          <header class="sheet__head">
            <h2 id="comentarios-title" class="t-title">Comentários</h2>
            <button type="button" aria-label="Fechar comentários" @click="emit('close')">
              <AppIcon name="close" :size="22" color="var(--text-secondary)" />
            </button>
          </header>

          <ul class="sheet__list">
            <li v-for="c in MOCK_COMENTARIOS" :key="c.id" class="comment">
              <div class="comment__avatar">{{ c.autor[0]?.toUpperCase() }}</div>
              <div class="comment__body">
                <div class="comment__head">
                  <span class="t-body-bold">{{ c.autor }}</span>
                  <span class="comment__time t-caption">{{ c.tempo }}</span>
                </div>
                <p class="comment__text t-body">{{ c.texto }}</p>
              </div>
            </li>
          </ul>

          <div class="sheet__input-row">
            <input
              v-model="draft"
              class="sheet__input"
              placeholder="Em breve..."
              disabled
              aria-label="Escrever comentário (indisponível)"
            />
            <span class="sheet__send" aria-hidden="true">
              <AppIcon name="send" :size="18" color="var(--text-on-primary)" />
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
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
  padding-bottom: var(--space-md);
  background: var(--background);
  border-radius: var(--radius-xxl) var(--radius-xxl) 0 0;
}

/* Em telas grandes o bottom sheet vira um diálogo centrado — uma folha colada
   no rodapé de um monitor não faz sentido. */
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
  padding: 0 var(--space-xl) var(--space-sm);
}

.sheet__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-xl);
}

.comment {
  display: flex;
  gap: var(--space-sm);
}

.comment__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  background: var(--primary);
  color: var(--text-on-primary);
  font-weight: 700;
}

.comment__body {
  flex: 1;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.comment__time {
  color: var(--text-muted);
}

.comment__text {
  margin-top: 2px;
  color: var(--text-secondary);
}

.sheet__input-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl) 0;
  border-top: 1px solid var(--border);
}

.sheet__input {
  flex: 1;
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-primary);
}

.sheet__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.4;
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
