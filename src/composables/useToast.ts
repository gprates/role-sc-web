import { readonly, ref } from 'vue';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
}

/**
 * Substituto web do `Alert.alert` informativo do React Native.
 *
 * O estado vive no módulo (fora da função) de propósito: qualquer tela pode
 * disparar um toast e o `ToastHost` montado uma única vez no App.vue os
 * renderiza todos.
 */
const toasts = ref<Toast[]>([]);
let nextId = 0;

const DEFAULT_DURATION_MS = 4500;

const dismiss = (id: number) => {
  toasts.value = toasts.value.filter((t) => t.id !== id);
};

const push = (
  variant: ToastVariant,
  title: string,
  message?: string,
  durationMs = DEFAULT_DURATION_MS,
): number => {
  const id = ++nextId;
  toasts.value = [...toasts.value, { id, variant, title, message }];
  window.setTimeout(() => dismiss(id), durationMs);
  return id;
};

export const useToast = () => ({
  toasts: readonly(toasts),
  dismiss,
  info: (title: string, message?: string) => push('info', title, message),
  success: (title: string, message?: string) => push('success', title, message),
  error: (title: string, message?: string) => push('error', title, message),
});
