<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import AppIcon from '@/components/AppIcon.vue';
import AppSpinner from '@/components/AppSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import EventoCard from '@/components/EventoCard.vue';
import FilterChip from '@/components/FilterChip.vue';
import { useEventos } from '@/composables/useEventos';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritosStore } from '@/stores/favoritos.store';
import type { Evento, EventosFilter } from '@/types';
import { CATEGORIAS, MUNICIPIOS_FIXOS } from '@/utils/constants';

/**
 * T07 — Home / listagem de eventos (porte de HomeScreen.tsx).
 *
 * Duas trocas de mecanismo em relação ao mobile:
 *   · FlatList + onEndReached  →  grade CSS + IntersectionObserver na sentinela
 *   · pull-to-refresh          →  botão de atualizar (gesto que não existe no
 *                                 desktop; no mobile o browser já usa o
 *                                 puxão-para-baixo para recarregar a página)
 */
const auth = useAuthStore();
const favoritos = useFavoritosStore();

const search = ref('');
const debouncedSearch = ref('');
const municipio = ref<string | null>(null);
const categoria = ref<string | null>(null);

let debounceTimer: number | null = null;
watch(search, (value) => {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debouncedSearch.value = value.trim();
  }, 400);
});

onBeforeUnmount(() => {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
});

const filter = computed<EventosFilter>(() => ({
  search: debouncedSearch.value || undefined,
  municipio: municipio.value ?? undefined,
  categoria: categoria.value ?? undefined,
}));

const { eventos, loading, refreshing, loadingMore, error, pagination, refresh, loadMore } =
  useEventos(filter);

const activeFilterCount = computed(
  () => (municipio.value ? 1 : 0) + (categoria.value ? 1 : 0),
);

const clearFilters = () => {
  municipio.value = null;
  categoria.value = null;
};

const toggleMunicipio = (value: string) => {
  municipio.value = municipio.value === value ? null : value;
};

const toggleCategoria = (value: string) => {
  categoria.value = categoria.value === value ? null : value;
};

const onToggleFavorito = (evento: Evento) => {
  void favoritos.toggle(evento);
};

const hasMore = computed(() => {
  const p = pagination.value;
  return p !== null && p.page < p.totalPages;
});

const resultLabel = computed(() => {
  const total = pagination.value?.total ?? 0;
  return `${total} ${total === 1 ? 'evento encontrado' : 'eventos encontrados'}`;
});

const primeiroNome = computed(() => auth.user?.nome?.split(' ')[0] ?? '');

/**
 * Scroll infinito. A sentinela fica ~600px abaixo do fim da lista (rootMargin),
 * então a próxima página começa a carregar antes do usuário chegar no fundo.
 */
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!sentinel.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && hasMore.value) {
        void loadMore();
      }
    },
    { rootMargin: '600px 0px' },
  );
  observer.observe(sentinel.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="home content-shell">
    <header class="home__header">
      <div class="home__greeting-row">
        <div>
          <p class="home__greeting t-body">
            Olá{{ primeiroNome ? `, ${primeiroNome}` : '' }}! 👋
          </p>
          <h1 class="home__title t-display">O que vai rolar hoje?</h1>
        </div>

        <button
          type="button"
          class="home__refresh"
          :disabled="refreshing || loading"
          aria-label="Atualizar lista de eventos"
          @click="refresh"
        >
          <AppIcon
            name="refresh-outline"
            :size="20"
            :class="{ 'home__refresh-icon--spinning': refreshing }"
          />
        </button>
      </div>

      <div class="search">
        <AppIcon name="search" :size="18" color="var(--text-muted)" />
        <input
          v-model="search"
          class="search__input"
          type="search"
          placeholder="Buscar eventos..."
          aria-label="Buscar eventos por título ou descrição"
        />
      </div>

      <p class="home__section-label t-micro">MUNICÍPIO</p>
      <div class="chips">
        <FilterChip
          v-for="m in MUNICIPIOS_FIXOS"
          :key="m"
          :label="m"
          :active="municipio === m"
          @click="toggleMunicipio(m)"
        />
      </div>

      <p class="home__section-label t-micro">CATEGORIA</p>
      <div class="chips">
        <FilterChip
          v-for="c in CATEGORIAS"
          :key="c"
          :label="c"
          :active="categoria === c"
          @click="toggleCategoria(c)"
        />
      </div>

      <div class="chips chips--extra">
        <!-- "Período" segue desabilitado, igual ao app: o backend aceita
             dataInicio/dataFim, mas a UI de seleção ainda não foi desenhada. -->
        <FilterChip icon="calendar-outline" label="Período" disabled />
        <FilterChip
          icon="options-outline"
          :label="activeFilterCount > 0 ? `Limpar (${activeFilterCount})` : 'Limpar'"
          :disabled="activeFilterCount === 0"
          @click="clearFilters"
        />
      </div>

      <p class="home__result t-body" :class="{ 'home__result--error': Boolean(error) }">
        <template v-if="loading">Carregando eventos...</template>
        <template v-else-if="error">{{ error }}</template>
        <template v-else>{{ resultLabel }}</template>
      </p>
    </header>

    <div v-if="loading" class="home__loading">
      <AppSpinner :size="36" />
    </div>

    <template v-else>
      <ul v-if="eventos.length > 0" class="grid">
        <li v-for="evento in eventos" :key="evento._id">
          <EventoCard
            :evento="evento"
            :favorito="favoritos.isFavorito(evento._id)"
            @toggle-favorito="onToggleFavorito(evento)"
          />
        </li>
      </ul>

      <EmptyState
        v-else
        icon="calendar-outline"
        title="Nenhum evento encontrado"
        subtitle="Tente ajustar os filtros ou volte mais tarde."
      />
    </template>

    <!-- Sentinela do scroll infinito. -->
    <div ref="sentinel" class="home__sentinel" aria-hidden="true" />

    <div v-if="loadingMore" class="home__loading-more">
      <AppSpinner :size="28" label="Carregando mais eventos" />
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-top: var(--space-md);
}

.home__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding-bottom: var(--space-md);
}

.home__greeting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.home__greeting {
  color: var(--text-secondary);
}

.home__title {
  margin-bottom: var(--space-sm);
  color: var(--text-primary);
}

.home__refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 50%;
  background: var(--surface);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.home__refresh:disabled {
  opacity: 0.6;
}

.home__refresh-icon--spinning {
  animation: refresh-spin 0.9s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.search {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
}

.search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--fs-body);
  color: var(--text-primary);
}

.search__input::placeholder {
  color: var(--text-muted);
}

/* Some com o "x" que o Chrome/Safari desenham em input[type=search]: some
   com o alinhamento do ícone e não combina com o resto do design. */
.search__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.home__section-label {
  margin-top: var(--space-md);
  color: var(--text-muted);
}

/**
 * No mobile os chips vivem num ScrollView horizontal. Aqui eles quebram em
 * linhas: em telas largas cabem todos de uma vez, e num celular a rolagem
 * lateral escondendo filtros é pior que duas linhas visíveis.
 */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  padding-block: var(--space-xxs);
}

.chips--extra {
  margin-top: var(--space-sm);
}

.home__result {
  margin-block: var(--space-md) var(--space-sm);
  color: var(--text-secondary);
}

.home__result--error {
  color: var(--danger);
}

.home__loading,
.home__loading-more {
  display: flex;
  justify-content: center;
  padding-block: var(--space-xxl);
}

.home__loading-more {
  padding-block: var(--space-lg);
}

.home__sentinel {
  height: 1px;
}

/**
 * A grade é a tradução de proporção da FlatList de coluna única: 1 card por
 * linha no celular, 2 no tablet, 3 no desktop.
 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
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
