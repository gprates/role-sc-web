<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { renderGoogleButton } from '@/composables/useGoogleSignIn';

/**
 * Botão "Continuar com o Google".
 *
 * Fora da v1 do site: fica oculto enquanto `VITE_GOOGLE_WEB_CLIENT_ID` estiver
 * vazio (ver `useGoogleSignIn`). Quem desenha o botão é o próprio Google (ver
 * `renderGoogleButton` para o porquê); aqui só cuidamos do espaço que ele
 * ocupa, do bloqueio enquanto outro login está em curso e do spinner enquanto
 * a credencial é trocada pela nossa sessão.
 */
withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
  }>(),
  { loading: false, disabled: false },
);

const emit = defineEmits<{ credential: [idToken: string] }>();

const host = ref<HTMLElement | null>(null);
const failed = ref(false);

let dispose: (() => void) | null = null;
let unmounted = false;

onMounted(async () => {
  if (!host.value) return;
  try {
    const cleanup = await renderGoogleButton(host.value, (idToken) =>
      emit('credential', idToken),
    );
    // A tela pode ter saído enquanto o script do Google carregava.
    if (unmounted) cleanup();
    else dispose = cleanup;
  } catch {
    failed.value = true;
  }
});

onBeforeUnmount(() => {
  unmounted = true;
  dispose?.();
});
</script>

<template>
  <div class="google-btn" :aria-busy="loading">
    <div ref="host" class="google-btn__host" />
    <p v-if="failed" class="google-btn__error t-caption">
      Não foi possível carregar o login com Google.
    </p>
    <!-- O botão vive num iframe do Google, então bloqueamos por cima. -->
    <div v-if="loading || disabled" class="google-btn__overlay">
      <span
        v-if="loading"
        class="google-btn__spinner app-spin"
        role="status"
        aria-label="Entrando com Google"
      />
    </div>
  </div>
</template>

<style scoped>
.google-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Altura do botão "large" do Google: evita o pulo de layout enquanto o
     script carrega. */
  min-height: 44px;
}

.google-btn__host {
  display: flex;
  justify-content: center;
  width: 100%;
}

.google-btn__error {
  color: var(--text-secondary);
  text-align: center;
}

.google-btn__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--surface) 60%, transparent);
  border-radius: var(--radius-pill);
  cursor: not-allowed;
}

.google-btn__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #3c4043;
  border-top-color: transparent;
  border-radius: 50%;
}
</style>
