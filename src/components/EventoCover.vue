<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { getCategoryGradientCss } from '@/theme';

import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Capa do evento: usa a imagem extraída pelo crawler quando existe, senão cai
 * no gradiente da categoria (RN26).
 *
 * As imagens moram nos servidores das prefeituras, e algumas somem da origem
 * (Balneário Camboriú remove eventos do site depois de um tempo). Por isso a
 * imagem é tentada UMA vez só: se falhar, vai direto para o placeholder.
 * Retentar deixava o card parado sem capa enquanto os vizinhos já estavam
 * prontos, o que parecia travamento.
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

const onError = () => {
  failed.value = true;
};

// Reseta o estado quando o card é reciclado para outro evento.
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
      :key="props.imageUrl ?? ''"
      class="cover__img"
      :src="props.imageUrl ?? ''"
      :loading="props.loading"
      decoding="async"
      referrerpolicy="no-referrer"
      alt=""
      @error="onError"
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
