<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Chip de filtro (município, categoria, ações). Quando ativo, recebe o
 * gradiente azul — igual ao `FilterChip.tsx` do mobile.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    icon?: IconName;
  }>(),
  { active: false, disabled: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="chip"
    :class="{ 'chip--active': props.active, 'chip--disabled': props.disabled }"
    :disabled="props.disabled"
    :aria-pressed="props.active"
    @click="$emit('click')"
  >
    <AppIcon v-if="props.icon" :name="props.icon" :size="14" />
    <span>{{ props.label }}</span>
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
