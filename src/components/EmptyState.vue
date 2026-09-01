<script setup lang="ts">
import AppIcon, { type IconName } from './AppIcon.vue';

withDefaults(defineProps<{ icon?: IconName; title: string; subtitle?: string }>(), {
  icon: 'calendar-outline',
});
</script>

<template>
  <div class="empty">
    <div class="empty__circle">
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

.empty__title {
  color: var(--text-primary);
}

.empty__subtitle {
  color: var(--text-muted);
  max-width: 42ch;
}
</style>
