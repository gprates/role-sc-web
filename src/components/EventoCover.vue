<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { getCategoryGradientCss } from '@/theme';

import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Capa do evento: usa a imagem extraída pelo crawler quando existe, senão cai
 * no gradiente da categoria (RN26).
 *
 * URLs de sites de prefeitura quebram com frequência, então falha de
 * carregamento também volta para o placeholder — mesmo comportamento do
 * `EventoCover.tsx` do mobile.
 */
const props = withDefaults(
  defineProps<{
    imageUrl?: string | null;
    categoria?: string | null;
    /** Proporção da capa. O detalhe usa uma faixa mais larga que o card. */
    ratio?: string;
    /** `eager` só na capa do detalhe, que é o LCP daquela página. */
    loading?: 'lazy' | 'eager';
  }>(),
  { ratio: '16 / 10', loading: 'lazy' },
);

const failed = ref(false);

// Reseta o fallback quando o card é reciclado para outro evento.
watch(
  () => props.imageUrl,
  () => {
    failed.value = false;
  },
);

const showPlaceholder = computed(() => !props.imageUrl || failed.value);
const gradient = computed(() => getCategoryGradientCss(props.categoria));

const CATEGORY_ICONS: Record<string, IconName> = {
  Cultura: 'color-palette-outline',
  Esporte: 'football-outline',
  Gastronomia: 'restaurant-outline',
  Educação: 'school-outline',
  Saúde: 'medkit-outline',
  'Meio Ambiente': 'leaf-outline',
  Turismo: 'sunny-outline',
  Religião: 'flower-outline',
};

const placeholderIcon = computed<IconName>(() => {
  if (!props.categoria) return 'calendar-outline';
  return CATEGORY_ICONS[props.categoria] ?? 'calendar-outline';
});
</script>

<template>
  <div class="cover" :style="{ aspectRatio: props.ratio }">
    <div v-if="showPlaceholder" class="cover__placeholder" :style="{ background: gradient }">
      <AppIcon :name="placeholderIcon" size="34%" color="rgba(255,255,255,0.65)" />
    </div>
    <img
      v-else
      class="cover__img"
      :src="props.imageUrl ?? ''"
      :loading="props.loading"
      decoding="async"
      alt=""
      @error="failed = true"
    />
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--surface-muted);
}

.cover__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.cover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
