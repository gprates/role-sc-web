<script setup lang="ts">
import { computed, ref } from 'vue';

import AppIcon, { type IconName } from './AppIcon.vue';

/**
 * Campo de formulário padronizado — porte do `Input.tsx` do app mobile.
 * Ícone opcional à esquerda e toggle de visibilidade quando `isPassword`.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string;
    icon?: IconName;
    isPassword?: boolean;
    placeholder?: string;
    type?: string;
    autocomplete?: string;
    inputmode?: 'text' | 'email' | 'numeric' | 'tel' | 'search' | 'url';
    maxlength?: number;
    disabled?: boolean;
    id?: string;
    ariaLabel?: string;
  }>(),
  { isPassword: false, type: 'text', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [string];
  submit: [];
}>();

const hidden = ref(props.isPassword);
const focused = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

const resolvedType = computed(() => {
  if (!props.isPassword) return props.type;
  return hidden.value ? 'password' : 'text';
});

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
};

/** Permite que a tela dê foco no campo (equivalente ao ref do TextInput no RN). */
defineExpose({ focus: () => inputEl.value?.focus() });
</script>

<template>
  <div
    class="field"
    :class="{ 'field--focused': focused, 'field--disabled': props.disabled }"
  >
    <AppIcon
      v-if="props.icon"
      :name="props.icon"
      :size="20"
      :color="focused ? 'var(--primary)' : 'var(--text-muted)'"
    />

    <input
      :id="props.id"
      ref="inputEl"
      class="field__input"
      :type="resolvedType"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :autocomplete="props.autocomplete"
      :inputmode="props.inputmode"
      :maxlength="props.maxlength"
      :disabled="props.disabled"
      :aria-label="props.ariaLabel ?? props.placeholder"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false"
      @keyup.enter="emit('submit')"
    />

    <button
      v-if="props.isPassword"
      type="button"
      class="field__toggle"
      :aria-label="hidden ? 'Mostrar senha' : 'Ocultar senha'"
      @click="hidden = !hidden"
    >
      <AppIcon
        :name="hidden ? 'eye-outline' : 'eye-off-outline'"
        :size="20"
        color="var(--text-muted)"
      />
    </button>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 52px;
  padding-inline: var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  transition: border-color 0.15s ease;
}

.field--focused {
  border-color: var(--primary);
}

.field--disabled {
  background: var(--surface-muted);
}

.field__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-primary);
}

.field__input::placeholder {
  color: var(--text-muted);
}

.field__toggle {
  display: flex;
  align-items: center;
  padding: 4px;
  margin-left: var(--space-xs);
}
</style>
