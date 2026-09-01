<script setup lang="ts">
import { computed } from 'vue';

import { getCategorySolid } from '@/theme';

/**
 * Pill colorida com o nome da categoria. A cor sai do mapa em theme/colors.ts,
 * o mesmo do app mobile.
 */
const props = withDefaults(
  defineProps<{ categoria: string | null | undefined; size?: 'sm' | 'md' }>(),
  { size: 'md' },
);

const background = computed(() => getCategorySolid(props.categoria));
</script>

<template>
  <span
    v-if="props.categoria"
    class="badge"
    :class="`badge--${props.size}`"
    :style="{ background }"
  >
    {{ props.categoria }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  border-radius: var(--radius-md);
  color: var(--text-on-primary);
  white-space: nowrap;
}

.badge--sm {
  padding: 4px var(--space-sm);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 700;
}

.badge--md {
  padding: 6px var(--space-md);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
}
</style>
