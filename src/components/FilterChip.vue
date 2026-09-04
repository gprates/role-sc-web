<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Chip de filtro (status, município, categoria, período, ações). Quando ativo,
 * recebe o gradiente azul — igual ao `FilterChip.tsx` do mobile.
 *
 * `trailing` desenha o chevron dos chips que abrem um modal. No mobile ele é
 * passado como `ReactNode`; aqui é um booleano, porque o único trailing que
 * existe no design é esse — e assim a cor acompanha o estado do chip sozinha,
 * sem o chamador ter que repetir o ternário de cor em toda chamada.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    icon?: IconName;
    /** Mostra o chevron indicando que o chip abre um seletor. */
    trailing?: boolean;
    /** Rótulo acessível quando o texto visível não basta (ex.: "Itajaí +2"). */
    ariaLabel?: string;
  }>(),
  { active: false, disabled: false, trailing: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="chip"
    :class="{ 'chip--active': props.active, 'chip--disabled': props.disabled }"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    :aria-haspopup="props.trailing ? 'dialog' : undefined"
    @click="$emit('click')"
  >
    <AppIcon v-if="props.icon" :name="props.icon" :size="14" />
    <span class="chip__label">{{ props.label }}</span>
    <AppIcon v-if="props.trailing" name="chevron-down" :size="14" />
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xxs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

/* Um município de nome longo ("Balneário Camboriú") não pode esticar o chip a
   ponto de empurrar o "Limpar" para fora da linha. */
.chip__label {
  max-width: 22ch;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip:not(:disabled):hover {
  background: var(--border-strong);
}

.chip--active,
.chip--active:not(:disabled):hover {
  background: var(--gradient-primary);
  color: var(--text-on-primary);
}

.chip--disabled {
  background: var(--chip-disabled-bg);
  color: var(--chip-disabled-text);
}
</style>
