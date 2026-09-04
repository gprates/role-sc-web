<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useDebounce } from '@/composables/useDebounce';

import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';
import BaseSheet from './BaseSheet.vue';

/**
 * Modal de seleção múltipla com busca (debounced) — usado pelos filtros de
 * município e categoria. Porte do `FilterSelectModal.tsx` do mobile.
 *
 * Mantém uma seleção "rascunho" própria: só grava no filtro de verdade quando
 * o usuário clica em Aplicar. É o que permite marcar três municípios sem
 * disparar três requisições no caminho.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    options: readonly string[];
    selected: string[];
    searchPlaceholder?: string;
  }>(),
  { searchPlaceholder: 'Buscar...' },
);

const emit = defineEmits<{ close: []; apply: [string[]] }>();

const search = ref('');
const draft = ref<string[]>([...props.selected]);
const debouncedSearch = useDebounce(search, 300);

// Ao abrir, o rascunho parte do filtro que está valendo e a busca zera.
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draft.value = [...props.selected];
    search.value = '';
  },
);

/**
 * Tira acento e caixa para a busca: "educacao" precisa achar "Educação".
 * NFD separa a letra do acento, e o range 0300–036F apaga os acentos soltos.
 */
const normalize = (v: string): string =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const filteredOptions = computed(() => {
  const query = normalize(debouncedSearch.value);
  if (!query) return props.options;
  return props.options.filter((o) => normalize(o).includes(query));
});

const toggleOption = (item: string) => {
  draft.value = draft.value.includes(item)
    ? draft.value.filter((v) => v !== item)
    : [...draft.value, item];
};

const handleApply = () => {
  emit('apply', [...draft.value]);
  emit('close');
};
</script>

<template>
  <BaseSheet :open="props.open" :title="props.title" @close="emit('close')">
    <div class="search">
      <AppIcon name="search" :size="18" color="var(--text-muted)" />
      <input
        v-model="search"
        class="search__input"
        type="text"
        :placeholder="props.searchPlaceholder"
        :aria-label="props.searchPlaceholder"
        autocomplete="off"
      />
      <button
        v-if="search.length > 0"
        type="button"
        class="search__clear"
        aria-label="Limpar busca"
        @click="search = ''"
      >
        <AppIcon name="close-circle" :size="18" color="var(--text-muted)" />
      </button>
    </div>

    <ul v-if="filteredOptions.length > 0" class="options">
      <li v-for="item in filteredOptions" :key="item">
        <button
          type="button"
          class="option"
          :class="{ 'option--active': draft.includes(item) }"
          :aria-pressed="draft.includes(item)"
          @click="toggleOption(item)"
        >
          <span>{{ item }}</span>
          <AppIcon
            :name="draft.includes(item) ? 'checkbox' : 'square-outline'"
            :size="22"
            :color="draft.includes(item) ? 'var(--primary)' : 'var(--border-strong)'"
          />
        </button>
      </li>
    </ul>

    <p v-else class="options__empty t-body">
      Nenhum resultado para &quot;{{ debouncedSearch }}&quot;
    </p>

    <template #footer>
      <AppButton
        label="Limpar"
        variant="secondary"
        :full-width="false"
        :disabled="draft.length === 0"
        @click="draft = []"
      />
      <AppButton
        :label="draft.length > 0 ? `Aplicar (${draft.length})` : 'Aplicar'"
        variant="primary"
        :full-width="false"
        @click="handleApply"
      />
    </template>
  </BaseSheet>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: none;
  margin: 0 var(--space-xl) var(--space-sm);
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

.search__clear {
  display: flex;
  flex: none;
}

/* A lista é a única parte que rola; cabeçalho e rodapé ficam fixos. */
.options {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 var(--space-xl) var(--space-sm);
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  padding-block: var(--space-sm);
  border-bottom: 1px solid var(--border);
  text-align: left;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-primary);
}

.option--active {
  font-weight: 600;
  color: var(--primary);
}

.options__empty {
  flex: 1;
  padding: var(--space-xl);
  text-align: center;
  color: var(--text-muted);
}
</style>
