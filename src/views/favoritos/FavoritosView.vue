<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import AppSpinner from '@/components/AppSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import EventoCard from '@/components/EventoCard.vue';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { useFavoritosStore } from '@/stores/favoritos.store';
import type { Evento } from '@/types';

/**
 * T10 — Favoritos (porte de FavoritosScreen.tsx).
 *
 * A lista agora vem da API e é paginada, então esta tela ganhou os mesmos
 * estados da Home: spinner inicial, mensagem de erro e scroll infinito. O store
 * continua global, então favoritar na Home reflete aqui na mesma hora — no
 * mobile isso exige `useFocusEffect` para recarregar ao voltar para a aba.
 */
const favoritos = useFavoritosStore();
const toast = useToast();

const subtitle = computed(() => {
  const n = favoritos.total;
  return `${n} ${n === 1 ? 'evento salvo' : 'eventos salvos'}`;
});

const onToggleFavorito = async (evento: Evento) => {
  try {
    await favoritos.toggle(evento);
  } catch (err) {
    toast.error('Favoritos', extractErrorMessage(err));
  }
};

/** Scroll infinito, igual ao da Home. */
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!sentinel.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && favoritos.hasMore) {
        void favoritos.loadMore();
      }
    },
    { rootMargin: '600px 0px' },
  );
  observer.observe(sentinel.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="favoritos content-shell">
    <header class="favoritos__header">
      <h1 class="t-display">Favoritos</h1>
      <p class="favoritos__subtitle t-body">{{ subtitle }}</p>
    </header>

    <div v-if="favoritos.loading" class="favoritos__center">
      <AppSpinner :size="36" />
    </div>

    <EmptyState
      v-else-if="favoritos.error && favoritos.favoritos.length === 0"
      icon="cloud-offline-outline"
      title="Não foi possível carregar"
      :subtitle="favoritos.error"
    />

    <ul v-else-if="favoritos.favoritos.length > 0" class="grid">
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
      image="/images/moinho.png"
      title="Nenhum favorito ainda"
      subtitle="Clique no coração de um evento para salvá-lo aqui."
    />

    <!-- Sentinela do scroll infinito. -->
    <div ref="sentinel" class="favoritos__sentinel" aria-hidden="true" />

    <div v-if="favoritos.loadingMore" class="favoritos__center favoritos__center--more">
      <AppSpinner :size="28" label="Carregando mais favoritos" />
    </div>
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

.favoritos__center {
  display: flex;
  justify-content: center;
  padding-block: var(--space-xxl);
}

.favoritos__center--more {
  padding-block: var(--space-lg);
}

.favoritos__sentinel {
  height: 1px;
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
