<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { getCategoryGradientCss } from '@/theme';

import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Capa do evento: usa a imagem extraída pelo crawler quando existe, senão cai
 * no gradiente da categoria (RN26).
 *
 * SOBRE AS FALHAS DE CARREGAMENTO
 * As imagens não são nossas: moram nos servidores das prefeituras. Duas coisas
 * distintas dão errado com elas, e o tratamento aqui é diferente para cada uma.
 *
 *  1. A imagem sumiu da origem (404 permanente). Nada a fazer — placeholder.
 *  2. A origem devolve erro só porque recebeu requisições demais de uma vez.
 *     Este caso é específico da WEB e não aparece no app: a FlatList do mobile
 *     renderiza uma coluna por vez, enquanto a grade aqui pede as imagens de
 *     uma página inteira quase simultaneamente — até 3 por fileira. Servidores
 *     como o da prefeitura de Itapema respondem 404 sob essa rajada e voltam
 *     a servir a mesma URL normalmente segundos depois.
 *
 * Por isso a falha não cai direto no placeholder: tentamos de novo até duas
 * vezes, com espera crescente e um jitter aleatório para as capas não
 * repetirem a rajada em uníssono. Só depois disso desistimos.
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

const MAX_RETRIES = 2;

const failed = ref(false);
const attempt = ref(0);
let retryTimer: number | null = null;

const clearRetry = () => {
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = null;
};

/**
 * A URL do <img>. O `?_r=` da retentativa existe só para o browser refazer a
 * requisição: sem ele o 404 anterior fica em cache e o retry não sai da
 * máquina. Servidores de conteúdo estático ignoram parâmetros desconhecidos.
 */
const src = computed(() => {
  if (!props.imageUrl) return '';
  if (attempt.value === 0) return props.imageUrl;
  const sep = props.imageUrl.includes('?') ? '&' : '?';
  return `${props.imageUrl}${sep}_r=${attempt.value}`;
});

const onError = () => {
  if (attempt.value >= MAX_RETRIES) {
    failed.value = true;
    return;
  }
  // 600ms, depois 1200ms, ±300ms de jitter.
  const delay = 600 * 2 ** attempt.value + Math.random() * 300;
  clearRetry();
  retryTimer = window.setTimeout(() => {
    attempt.value += 1;
  }, delay);
};

// Reseta o estado quando o card é reciclado para outro evento.
watch(
  () => props.imageUrl,
  () => {
    clearRetry();
    failed.value = false;
    attempt.value = 0;
  },
);

onBeforeUnmount(clearRetry);

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
      :key="src"
      class="cover__img"
      :src="src"
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
