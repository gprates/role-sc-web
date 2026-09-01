<script setup lang="ts">
import { computed } from 'vue';

/**
 * Logo do Rolê SC — "R" em gradiente azul, gerado em CSS.
 * Igual ao `Logo.tsx` do mobile: sem asset de imagem no bundle.
 */
const props = withDefaults(defineProps<{ size?: number }>(), { size: 72 });

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${props.size * 0.55}px`,
  borderRadius: `${Math.round(props.size * 0.28)}px`,
}));
</script>

<template>
  <div class="logo" :style="style" role="img" aria-label="Rolê SC">R</div>
</template>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary-diag);
  color: #0a1e3c;
  font-weight: 900;
  font-style: italic;
  line-height: 1;
  overflow: hidden;
  user-select: none;
}
</style>
