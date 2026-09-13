<script setup lang="ts">
import { computed } from 'vue';

import AppButton from '@/components/AppButton.vue';
import AppLogo from '@/components/AppLogo.vue';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 404. Não existe no app mobile (um stack navigator não tem "URL inválida"),
 * mas na web é obrigatório: alguém sempre digita ou compartilha um endereço
 * quebrado.
 */
const auth = useAuthStore();
const destino = computed(() => (auth.isAuthenticated ? 'home' : 'login'));
const label = computed(() =>
  auth.isAuthenticated ? 'Ver eventos' : 'Ir para o login',
);
</script>

<template>
  <main class="nf">
    <AppLogo :size="72" />
    <img class="nf__barco" src="/images/barco.png" alt="" aria-hidden="true" draggable="false" />
    <p class="nf__code t-micro">ERRO 404</p>
    <h1 class="t-display">Parece que você se perdeu no mar</h1>
    <p class="nf__text t-body">
      O endereço que você tentou abrir não existe ou foi movido.
    </p>
    <RouterLink :to="{ name: destino }" class="nf__action">
      <AppButton :label="label" />
    </RouterLink>
  </main>
</template>

<style scoped>
.nf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 100dvh;
  padding: var(--space-xl);
  text-align: center;
}

.nf__barco {
  width: min(280px, 70vw);
  height: auto;
  margin-top: var(--space-lg);
  user-select: none;
}

.nf__code {
  margin-top: var(--space-sm);
  color: var(--text-muted);
}

.nf__text {
  color: var(--text-secondary);
  max-width: 42ch;
}

.nf__action {
  margin-top: var(--space-lg);
  min-width: 220px;
}
</style>
