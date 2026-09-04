<script setup lang="ts">
import type { EventoStatus } from '@/types';

import AppIcon from './AppIcon.vue';
import BaseSheet from './BaseSheet.vue';

/**
 * Sheet de seleção única (Por vir / Já aconteceram / Todos). Porte do
 * `StatusFilterModal.tsx` do mobile.
 *
 * Diferente dos outros filtros, aplica direto ao clicar na opção — não precisa
 * de botão "Aplicar" porque só existe uma escolha possível de cada vez.
 */
interface StatusOption {
  value: EventoStatus | undefined;
  label: string;
}

// `undefined` = "Todos" (sem filtro de status no backend).
const STATUS_OPTIONS: StatusOption[] = [
  { value: 'ativos', label: 'Por vir' },
  { value: 'passados', label: 'Já aconteceram' },
  { value: undefined, label: 'Todos' },
];

const props = defineProps<{ open: boolean; value: EventoStatus | undefined }>();
const emit = defineEmits<{ close: []; apply: [EventoStatus | undefined] }>();

const handleSelect = (next: EventoStatus | undefined) => {
  emit('apply', next);
  emit('close');
};
</script>

<template>
  <BaseSheet :open="props.open" title="Eventos" @close="emit('close')">
    <ul class="options">
      <li v-for="opt in STATUS_OPTIONS" :key="opt.label">
        <button
          type="button"
          class="option"
          :class="{ 'option--active': opt.value === props.value }"
          :aria-pressed="opt.value === props.value"
          @click="handleSelect(opt.value)"
        >
          <span>{{ opt.label }}</span>
          <AppIcon
            :name="opt.value === props.value ? 'radio-button-on' : 'radio-button-off'"
            :size="22"
            :color="opt.value === props.value ? 'var(--primary)' : 'var(--border-strong)'"
          />
        </button>
      </li>
    </ul>
  </BaseSheet>
</template>

<style scoped>
.options {
  padding: 0 var(--space-xl);
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
</style>
