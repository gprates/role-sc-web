<script setup lang="ts">
withDefaults(defineProps<{ size?: number; label?: string }>(), {
  size: 32,
  label: 'Carregando',
});
</script>

<template>
  <span
    class="spinner"
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
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
