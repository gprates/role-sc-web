<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import AppIcon from '@/components/AppIcon.vue';
import AppSpinner from '@/components/AppSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import EventoCard from '@/components/EventoCard.vue';
import FilterChip from '@/components/FilterChip.vue';
import FilterSelectModal from '@/components/FilterSelectModal.vue';
import PeriodoFilterModal from '@/components/PeriodoFilterModal.vue';
import StatusFilterModal from '@/components/StatusFilterModal.vue';
import { useDebounce } from '@/composables/useDebounce';
import { useEventos } from '@/composables/useEventos';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritosStore } from '@/stores/favoritos.store';
import type { Evento, EventosFilter, EventoStatus } from '@/types';
import { CATEGORIAS, MUNICIPIOS_FIXOS } from '@/utils/constants';
import { formatDayMonth } from '@/utils/dateRange';
import { toBackendDate } from '@/utils/format';

/**
 * T07 — Home / listagem de eventos (porte de HomeScreen.tsx).
 *
 * Duas trocas de mecanismo em relação ao mobile:
 *   · FlatList + onEndReached  →  grade CSS + IntersectionObserver na sentinela
 *   · pull-to-refresh          →  botão de atualizar (gesto que não existe no
 *                                 desktop; no mobile o browser já usa o
 *                                 puxão-para-baixo para recarregar a página)
 *
 * Os filtros seguem o app: uma linha de chips que abrem sheets de seleção. A
 * versão anterior espalhava um chip por município e outro por categoria direto
 * na página — não escala, porque a lista de categorias e de municípios cresce
 * conforme o crawler cobre novas fontes.
 */
const auth = useAuthStore();
const favoritos = useFavoritosStore();
const toast = useToast();

const search = ref('');
const debouncedSearch = useDebounce(search, 400);

const municipio = ref<string[]>([]);
const categoria = ref<string[]>([]);
const dataInicio = ref<Date | null>(null);
const dataFim = ref<Date | null>(null);
// Padrão "ativos": eventos passados não interessam tanto ao usuário quanto os
// que ainda vão rolar, então a Home já abre filtrada pra "Por vir".
const status = ref<EventoStatus | undefined>('ativos');

const municipioModal = ref(false);
const categoriaModal = ref(false);
const periodoModal = ref(false);
const statusModal = ref(false);

const filter = computed<EventosFilter>(() => ({
  search: debouncedSearch.value.trim() || undefined,
  municipio: municipio.value.length > 0 ? municipio.value.join(',') : undefined,
  categoria: categoria.value.length > 0 ? categoria.value.join(',') : undefined,
  dataInicio: dataInicio.value ? toBackendDate(dataInicio.value) : undefined,
  dataFim: dataFim.value ? toBackendDate(dataFim.value) : undefined,
  status: status.value,
}));

const { eventos, loading, refreshing, loadingMore, error, pagination, refresh, loadMore } =
  useEventos(filter);

/** "Município" (nada selecionado) | "Itajaí" (1) | "Itajaí +2" (várias). */
const multiSelectLabel = (selected: string[], fallback: string): string => {
  const [primeiro] = selected;
  if (!primeiro) return fallback;
  if (selected.length === 1) return primeiro;
  return `${primeiro} +${selected.length - 1}`;
};

const STATUS_LABELS: Record<'ativos' | 'passados' | 'todos', string> = {
  ativos: 'Por vir',
  passados: 'Já aconteceram',
  todos: 'Todos',
};

const municipioLabel = computed(() => multiSelectLabel(municipio.value, 'Município'));
const categoriaLabel = computed(() => multiSelectLabel(categoria.value, 'Categoria'));
const statusLabel = computed(() => STATUS_LABELS[status.value ?? 'todos']);

const periodoLabel = computed(() => {
  if (dataInicio.value && dataFim.value) {
    return `${formatDayMonth(dataInicio.value)} - ${formatDayMonth(dataFim.value)}`;
  }
  if (dataInicio.value) return `A partir de ${formatDayMonth(dataInicio.value)}`;
  if (dataFim.value) return `Até ${formatDayMonth(dataFim.value)}`;
  return 'Período';
});

/** O chip mostra o nome curto; o leitor de tela recebe a seleção inteira. */
const listLabel = (selected: string[], nome: string): string | undefined =>
  selected.length > 1 ? `${nome}: ${selected.join(', ')}` : undefined;

const activeFilterCount = computed(() => {
  let c = 0;
  if (municipio.value.length > 0) c++;
  if (categoria.value.length > 0) c++;
  if (dataInicio.value || dataFim.value) c++;
  // "ativos" é o padrão da tela — só conta como filtro ativo quando o usuário
  // se afasta dele (passados ou todos).
  if (status.value !== 'ativos') c++;
  return c;
});

const clearFilters = () => {
  municipio.value = [];
  categoria.value = [];
  dataInicio.value = null;
  dataFim.value = null;
  status.value = 'ativos';
};

const applyPeriodo = (inicio: Date | null, fim: Date | null) => {
  dataInicio.value = inicio;
  dataFim.value = fim;
};

const onToggleFavorito = async (evento: Evento) => {
  try {
    await favoritos.toggle(evento);
  } catch (err) {
    // O store já desfez o otimismo; aqui só avisamos por que o coração voltou.
    toast.error('Favoritos', extractErrorMessage(err));
  }
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

      <p class="home__section-label t-micro">FILTROS</p>
      <div class="chips">
        <FilterChip
          icon="time-outline"
          :label="statusLabel"
          :active="status !== 'ativos'"
          trailing
          @click="statusModal = true"
        />
        <FilterChip
          icon="location-outline"
          :label="municipioLabel"
          :aria-label="listLabel(municipio, 'Município')"
          :active="municipio.length > 0"
          trailing
          @click="municipioModal = true"
        />
        <FilterChip
          icon="pricetag-outline"
          :label="categoriaLabel"
          :aria-label="listLabel(categoria, 'Categoria')"
          :active="categoria.length > 0"
          trailing
          @click="categoriaModal = true"
        />
        <FilterChip
          icon="calendar-outline"
          :label="periodoLabel"
          :active="Boolean(dataInicio || dataFim)"
          trailing
          @click="periodoModal = true"
        />
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
      <div v-if="eventos.length > 0" class="vitrine">
        <!-- Mascote espiando por trás do último card da primeira fileira. -->
        <img
          class="vitrine__capivara"
          src="/images/capivara.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />

        <ul class="grid">
          <li v-for="evento in eventos" :key="evento._id">
            <EventoCard
              :evento="evento"
              :favorito="favoritos.isFavorito(evento._id)"
              @toggle-favorito="onToggleFavorito(evento)"
            />
          </li>
        </ul>
      </div>

      <EmptyState
        v-else
        image="/images/barco.png"
        title="Nenhum evento encontrado"
        subtitle="Tente ajustar os filtros ou volte mais tarde."
      />
    </template>

    <!-- Sentinela do scroll infinito. -->
    <div ref="sentinel" class="home__sentinel" aria-hidden="true" />

    <div v-if="loadingMore" class="home__loading-more">
      <AppSpinner :size="28" label="Carregando mais eventos" />
    </div>

    <FilterSelectModal
      :open="municipioModal"
      title="Município"
      :options="MUNICIPIOS_FIXOS"
      :selected="municipio"
      search-placeholder="Buscar município..."
      @close="municipioModal = false"
      @apply="municipio = $event"
    />

    <FilterSelectModal
      :open="categoriaModal"
      title="Categoria"
      :options="CATEGORIAS"
      :selected="categoria"
      search-placeholder="Buscar categoria..."
      @close="categoriaModal = false"
      @apply="categoria = $event"
    />

    <PeriodoFilterModal
      :open="periodoModal"
      :data-inicio="dataInicio"
      :data-fim="dataFim"
      @close="periodoModal = false"
      @apply="applyPeriodo"
    />

    <StatusFilterModal
      :open="statusModal"
      :value="status"
      @close="statusModal = false"
      @apply="status = $event"
    />
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
 * Capivara "sentada" atrás do card da direita da primeira fileira. Ela rola
 * junto com a grade (não é fixa): se ficasse presa na tela, o card sairia de
 * baixo dela no scroll e a ilusão de estar apoiada se perderia.
 *
 * A borda direita da grade é sempre a do último card da primeira fileira, com
 * 1, 2 ou 3 colunas — então `right` fixo serve em todos os breakpoints.
 * `isolation` cria o contexto de empilhamento para a imagem (z 0) ficar atrás
 * da grade (z 1) sem interferir no resto da página.
 */
.vitrine {
  position: relative;
  isolation: isolate;
  margin-top: var(--space-lg);
}

.vitrine__capivara {
  position: absolute;
  top: 0;
  right: var(--space-lg);
  z-index: 0;
  width: 92px;
  height: auto;
  /* ~82% da altura fica acima do card; os ombros somem por trás dele. */
  transform: translateY(-82%);
  pointer-events: none;
  user-select: none;
}

.vitrine .grid {
  position: relative;
  z-index: 1;
}

@media (min-width: 640px) {
  .vitrine__capivara {
    width: 120px;
  }
}

@media (min-width: 1024px) {
  .vitrine__capivara {
    right: var(--space-xl);
    width: 150px;
  }
}

/**
 * A grade é a tradução de proporção da FlatList de coluna única: 1 card por
 * linha no celular, 2 no tablet, 3 no desktop.
 *
 * `align-items: stretch` (padrão do grid) + o `<li>` como flex fazem todos os
 * cards de uma linha terminarem na mesma altura, independentemente de quantas
 * linhas o título ocupa ou de o evento ter ou não local.
 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

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
