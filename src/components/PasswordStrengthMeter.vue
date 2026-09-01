<script setup lang="ts">
import { computed } from 'vue';

import { PASSWORD_REQUIREMENTS, validatePassword } from '@/utils/password';

import AppIcon from './AppIcon.vue';

/**
 * Checklist visual ao vivo dos 5 requisitos de senha (RN08).
 * Cada regra fica cinza (não cumprida) ou verde (cumprida) conforme o usuário
 * digita — porte do `PasswordStrengthMeter.tsx` do mobile.
 */
const props = withDefaults(
  defineProps<{ password: string; hideWhenEmpty?: boolean }>(),
  { hideWhenEmpty: true },
);

const strength = computed(() => validatePassword(props.password));
const visible = computed(() => !props.hideWhenEmpty || props.password.length > 0);

/** Quantas regras já passaram — vira o texto do live region. */
const metCount = computed(
  () => PASSWORD_REQUIREMENTS.filter((r) => strength.value[r.key]).length,
);
</script>

<template>
  <div v-if="visible" class="meter">
    <p class="sr-only" aria-live="polite">
      {{ metCount }} de {{ PASSWORD_REQUIREMENTS.length }} requisitos de senha atendidos.
    </p>
    <div v-for="req in PASSWORD_REQUIREMENTS" :key="req.key" class="meter__row">
      <AppIcon
        :name="strength[req.key] ? 'checkmark-circle' : 'ellipse-outline'"
        :size="16"
        :color="strength[req.key] ? 'var(--success)' : 'var(--text-muted)'"
      />
      <span :class="strength[req.key] ? 'meter__ok' : 'meter__pending'">
        {{ req.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.meter {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.meter__row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
}

.meter__ok {
  color: var(--success);
}

.meter__pending {
  color: var(--text-muted);
}
</style>
