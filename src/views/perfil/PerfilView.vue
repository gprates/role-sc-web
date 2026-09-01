<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import AppIcon from '@/components/AppIcon.vue';
import AppSpinner from '@/components/AppSpinner.vue';
import { useAvatarUpload } from '@/composables/useAvatarUpload';
import { useConfirm } from '@/composables/useConfirm';
import { useAuthStore } from '@/stores/auth.store';
import { APP_VERSION } from '@/utils/constants';

/** T11 — Perfil (porte de PerfilScreen.tsx). */
const auth = useAuthStore();
const router = useRouter();
const { confirm } = useConfirm();
const { uploading, inputRef, acceptAttr, openPicker, handleFileChange } = useAvatarUpload();

const inicial = computed(() => auth.user?.nome?.[0]?.toUpperCase() ?? '?');

const handleLogout = async () => {
  const sair = await confirm({
    title: 'Sair',
    message: 'Deseja realmente encerrar sua sessão?',
    confirmLabel: 'Sair',
    destructive: true,
  });
  if (!sair) return;

  await auth.signOut();
  await router.replace({ name: 'login' });
};
</script>

<template>
  <div class="perfil content-shell">
    <h1 class="perfil__page-title t-display">Meu Perfil</h1>

    <section class="perfil__avatar-section">
      <button
        type="button"
        class="avatar"
        :disabled="uploading"
        aria-label="Alterar foto de perfil"
        @click="openPicker"
      >
        <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="Foto de perfil" />
        <span v-else class="avatar__initial">{{ inicial }}</span>

        <span v-if="uploading" class="avatar__overlay">
          <AppSpinner :size="28" label="Enviando foto" />
        </span>

        <span class="avatar__camera" aria-hidden="true">
          <AppIcon name="camera" :size="14" color="var(--text-on-primary)" />
        </span>
      </button>

      <!-- Substitui o image picker nativo do app: o próprio SO oferece a
           câmera quando o dispositivo tem uma. -->
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        :accept="acceptAttr"
        @change="handleFileChange"
      />

      <p class="perfil__name t-title">{{ auth.user?.nome ?? 'Visitante' }}</p>
      <p class="perfil__email t-body">{{ auth.user?.email ?? 'visitante@rolesc.app' }}</p>

      <RouterLink :to="{ name: 'editar-perfil' }" class="perfil__edit t-body-bold">
        <AppIcon name="create-outline" :size="16" />
        <span>Editar perfil</span>
      </RouterLink>
    </section>

    <p class="perfil__section-label t-micro">CONTA</p>

    <RouterLink :to="{ name: 'alterar-senha' }" class="list-item">
      <span class="list-item__icon">
        <AppIcon name="lock-closed-outline" :size="20" color="var(--primary)" />
      </span>
      <span class="list-item__label t-body-bold">Alterar senha</span>
      <AppIcon name="chevron-forward" :size="18" color="var(--text-muted)" />
    </RouterLink>

    <button type="button" class="logout" @click="handleLogout">
      <AppIcon name="log-out-outline" :size="20" />
      <span class="t-body-bold">Sair</span>
    </button>

    <p class="perfil__version t-caption">Rolê SC · versão {{ APP_VERSION }}</p>
  </div>
</template>

<style scoped>
.perfil {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  /* O perfil é conteúdo estreito: esticá-lo por 1180px deixaria a lista de
     itens perdida no meio do vazio. */
  max-width: 560px;
}

.perfil__page-title {
  margin-bottom: var(--space-md);
  color: var(--text-primary);
}

.perfil__avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.avatar {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--gradient-avatar);
  flex: none;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 46px;
  font-weight: 700;
  color: var(--text-on-primary);
}

.avatar__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay);
}

.avatar__camera {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--background);
}

.perfil__name {
  margin-top: var(--space-xs);
  color: var(--text-primary);
}

.perfil__email {
  color: var(--text-muted);
}

.perfil__edit {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--primary);
}

.perfil__section-label {
  margin-top: var(--space-md);
  margin-bottom: var(--space-xs);
  color: var(--text-muted);
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: inherit;
  transition: transform 0.12s ease;
}

.list-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.list-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: var(--surface-muted);
}

.list-item__label {
  flex: 1;
  color: var(--text-primary);
}

.logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  margin-top: var(--space-lg);
  padding-block: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: var(--danger);
}

.logout:hover {
  box-shadow: var(--shadow-md);
}

.perfil__version {
  margin-top: var(--space-lg);
  text-align: center;
  color: var(--text-muted);
}
</style>
