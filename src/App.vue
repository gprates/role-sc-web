<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppSpinner from '@/components/AppSpinner.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ToastHost from '@/components/ToastHost.vue';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Raiz do app — equivalente ao App.tsx + RootNavigator do mobile.
 *
 * O gate de autenticação em si vive no `router.beforeEach`; aqui só ficam a
 * tela de carregamento inicial (enquanto o localStorage é lido) e os dois
 * hosts globais de feedback (toasts e diálogo de confirmação).
 */
const auth = useAuthStore();
</script>

<template>
  <div v-if="auth.bootstrapping" class="boot">
    <AppSpinner :size="40" label="Carregando o Rolê SC" />
  </div>

  <RouterView v-else v-slot="{ Component, route }">
    <Transition name="route-fade" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>

  <ToastHost />
  <ConfirmDialog />
</template>

<style scoped>
.boot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
}
</style>
