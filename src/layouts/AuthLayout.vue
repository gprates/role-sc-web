<script setup lang="ts">
import { RouterView } from 'vue-router';

/**
 * Casca das telas de autenticação.
 *
 * No mobile cada tela ocupa a largura toda do aparelho. Aqui a única mudança é
 * de proporção: o formulário vira um cartão de largura fixa, centrado —
 * esticar campos de senha por 1920px de tela seria ilegível.
 */
</script>

<template>
  <main class="auth">
    <div class="auth__card">
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.auth {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: var(--space-lg) var(--space-md);
}

.auth__card {
  width: 100%;
  max-width: var(--form-max);
}

/* A partir do tablet o cartão ganha superfície própria, separando o formulário
   do fundo gradiente. No celular ele fica "solto", como no app. */
@media (min-width: 640px) {
  .auth {
    padding-block: var(--space-xxl);
  }

  .auth__card {
    padding: var(--space-xxl) var(--space-xl);
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    border: 1px solid var(--border);
    border-radius: var(--radius-xxl);
    box-shadow: var(--shadow-xl);
    backdrop-filter: blur(6px);
  }
}
</style>
