<script setup lang="ts">
import { computed } from 'vue';

/**
 * Logo do Rolê SC — imagem circular servida de `public/images`.
 */
const props = withDefaults(defineProps<{ size?: number }>(), { size: 72 });

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<template>
  <img
    class="logo"
    src="/images/logo-role-sc.png"
    alt="Rolê SC"
    :width="size"
    :height="size"
    :style="style"
    draggable="false"
  />
</template>

<style scoped>
.logo {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
  user-select: none;
}
</style>
