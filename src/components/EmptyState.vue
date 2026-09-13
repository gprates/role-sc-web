<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * `image` (ilustração de `public/images`) substitui o ícone no círculo quando
 * informada — usada nos estados vazios "de verdade" (nenhum evento, nenhum
 * favorito). Erros continuam com ícone, para não parecerem decorativos.
 */
withDefaults(
  defineProps<{ icon?: IconName; image?: string; title: string; subtitle?: string }>(),
  { icon: 'calendar-outline', image: undefined },
);
</script>

<template>
  <div class="empty">
    <img
      v-if="image"
      class="empty__image"
      :src="image"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <div v-else class="empty__circle">
      <AppIcon :name="icon" :size="38" color="var(--primary)" />
    </div>
    <p class="empty__title t-subtitle">{{ title }}</p>
    <p v-if="subtitle" class="empty__subtitle t-body">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-xxl) var(--space-xl);
  text-align: center;
}

.empty__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-md);
  margin-bottom: var(--space-xs);
}

.empty__image {
  width: min(220px, 60vw);
  height: auto;
  margin-bottom: var(--space-sm);
  user-select: none;
}

.empty__title {
  color: var(--text-primary);
}

.empty__subtitle {
  color: var(--text-muted);
  max-width: 42ch;
}
</style>
