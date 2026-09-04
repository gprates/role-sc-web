<script setup lang="ts">
import { computed } from 'vue';

import EmptyState from '@/components/EmptyState.vue';
import EventoCard from '@/components/EventoCard.vue';
import { useFavoritosStore } from '@/stores/favoritos.store';
import type { Evento } from '@/types';

/**
 * T10 — Favoritos (porte de FavoritosScreen.tsx).
 *
 * No mobile a tela precisa de `useFocusEffect` para recarregar a lista ao
 * voltar para a aba. Aqui não: o store é global, então favoritar na home já
 * reflete aqui na mesma hora.
 */
const favoritos = useFavoritosStore();

const subtitle = computed(() => {
  const n = favoritos.total;
  return `${n} ${n === 1 ? 'evento salvo' : 'eventos salvos'}`;
});

const onToggleFavorito = (evento: Evento) => {
  void favoritos.toggle(evento);
};
</script>

<template>
  <div class="favoritos content-shell">
    <header class="favoritos__header">
      <h1 class="t-display">Favoritos</h1>
      <p class="favoritos__subtitle t-body">{{ subtitle }}</p>
    </header>

    <ul v-if="favoritos.favoritos.length > 0" class="grid">
      <li v-for="evento in favoritos.favoritos" :key="evento._id">
        <EventoCard
          :evento="evento"
          favorito
          @toggle-favorito="onToggleFavorito(evento)"
        />
      </li>
    </ul>

    <EmptyState
      v-else
      icon="heart-outline"
      title="Nenhum favorito ainda"
      subtitle="Clique no coração de um evento para salvá-lo aqui."
    />
  </div>
</template>

<style scoped>
.favoritos {
  padding-top: var(--space-md);
}

.favoritos__header {
  padding-block: var(--space-sm) var(--space-lg);
}

.favoritos__subtitle {
  margin-top: 2px;
  color: var(--text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

/* Mesma regra da Home: o item da grade estica, o card preenche, e todos os
   cards de uma fileira terminam na mesma altura. */
.grid > li {
  display: flex;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-lg);
  }
}
</style>
