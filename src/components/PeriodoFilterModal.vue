<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  QUICK_RANGE_OPTIONS,
  fromDateInputValue,
  isSameDay,
  toDateInputValue,
  type DateRange,
} from '@/utils/dateRange';

import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';
import BaseSheet from './BaseSheet.vue';

/**
 * Modal de filtro por período: atalhos rápidos (esta semana, próxima semana,
 * próximo mês) ou escolha manual das datas. Porte do `PeriodoFilterModal.tsx`.
 *
 * Onde o mobile abre o `DateTimePickerAndroid`, aqui usamos
 * `<input type="date">`: é o mesmo papel — o seletor de data nativo da
 * plataforma — sem trazer nenhuma biblioteca de calendário para o bundle.
 *
 * Mantém um rascunho próprio de from/to; só grava no filtro em Aplicar.
 */
const props = defineProps<{
  open: boolean;
  dataInicio: Date | null;
  dataFim: Date | null;
}>();

const emit = defineEmits<{
  close: [];
  apply: [inicio: Date | null, fim: Date | null];
}>();

const from = ref<Date | null>(props.dataInicio);
const to = ref<Date | null>(props.dataFim);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    from.value = props.dataInicio;
    to.value = props.dataFim;
  },
);

const activeQuickKey = computed(
  () =>
    QUICK_RANGE_OPTIONS.find((opt) => {
      const range = opt.getRange();
      return isSameDay(from.value, range.from) && isSameDay(to.value, range.to);
    })?.key,
);

const handleQuickSelect = (getRange: () => DateRange) => {
  const range = getRange();
  from.value = range.from;
  to.value = range.to;
};

/**
 * O `min`/`max` dos inputs já impede escolher um intervalo invertido pelo
 * picker, mas nada impede o usuário de digitar a data na mão — então o ajuste
 * também acontece aqui, como no mobile.
 */
const onFromInput = (event: Event) => {
  const next = fromDateInputValue((event.target as HTMLInputElement).value);
  from.value = next;
  if (next && to.value && next > to.value) to.value = next;
};

const onToInput = (event: Event) => {
  const next = fromDateInputValue((event.target as HTMLInputElement).value);
  to.value = next;
  if (next && from.value && next < from.value) from.value = next;
};

const handleApply = () => {
  emit('apply', from.value, to.value);
  emit('close');
};
</script>

<template>
  <BaseSheet :open="props.open" title="Período" @close="emit('close')">
    <div class="body">
      <p class="label t-micro">ATALHOS</p>
      <div class="quick">
        <button
          v-for="opt in QUICK_RANGE_OPTIONS"
          :key="opt.key"
          type="button"
          class="quick__chip"
          :class="{ 'quick__chip--active': activeQuickKey === opt.key }"
          :aria-pressed="activeQuickKey === opt.key"
          @click="handleQuickSelect(opt.getRange)"
        >
          {{ opt.label }}
        </button>
      </div>

      <p class="label t-micro">OU ESCOLHA AS DATAS</p>
      <div class="dates">
        <label class="date">
          <AppIcon name="calendar-outline" :size="16" color="var(--text-muted)" />
          <span class="sr-only">Data inicial</span>
          <input
            class="date__input"
            type="date"
            :value="toDateInputValue(from)"
            :max="toDateInputValue(to) || undefined"
            @input="onFromInput"
          />
        </label>

        <AppIcon name="arrow-forward" :size="16" color="var(--text-muted)" />

        <label class="date">
          <AppIcon name="calendar-outline" :size="16" color="var(--text-muted)" />
          <span class="sr-only">Data final</span>
          <input
            class="date__input"
            type="date"
            :value="toDateInputValue(to)"
            :min="toDateInputValue(from) || undefined"
            @input="onToInput"
          />
        </label>
      </div>
    </div>

    <template #footer>
      <AppButton
        label="Limpar"
        variant="secondary"
        :full-width="false"
        :disabled="!from && !to"
        @click="
          from = null;
          to = null;
        "
      />
      <AppButton
        label="Aplicar"
        variant="primary"
        :full-width="false"
        @click="handleApply"
      />
    </template>
  </BaseSheet>
</template>

<style scoped>
.body {
  padding: 0 var(--space-xl) var(--space-lg);
}

.label {
  margin-top: var(--space-sm);
  margin-bottom: var(--space-xs);
  color: var(--text-muted);
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.quick__chip {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.quick__chip--active {
  background: var(--gradient-primary);
  color: var(--text-on-primary);
}

.dates {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.date {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex: 1;
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.date__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--fs-body);
  color: var(--text-primary);
  cursor: pointer;
}

/* Safari/iOS deixam o input de data com altura própria e alinhado ao topo. */
.date__input::-webkit-date-and-time-value {
  text-align: left;
}
</style>
