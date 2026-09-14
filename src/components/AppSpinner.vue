<script setup lang="ts">
withDefaults(defineProps<{ size?: number; label?: string }>(), {
  size: 32,
  label: 'Carregando',
});
</script>

<template>
  <span
    class="spinner app-spin"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="status"
    :aria-label="label"
  />
</template>

<style scoped>
.spinner {
  display: inline-block;
  border: 3px solid var(--border-strong);
  border-top-color: var(--primary);
  border-radius: 50%;
  /* A rotação vem de `.app-spin` (global.css) — compartilhada com os demais
     indicadores e imune ao kill-switch de prefers-reduced-motion. */
}
</style>
