<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { authService } from '@/services/auth.service';

/**
 * T03 — Verificar email (porte de VerificarEmailScreen.tsx).
 *
 * Exibida após o cadastro OU quando o login retorna EMAIL_NOT_VERIFIED.
 * O cooldown de 60s espelha o rate limit server-side do reenvio (RN10).
 */
const RESEND_COOLDOWN_SECONDS = 60;

const route = useRoute();
const toast = useToast();

const email = computed(() =>
  typeof route.query.email === 'string' ? route.query.email : '',
);

const resending = ref(false);
const cooldown = ref(0);
const jaReenviou = ref(false);
let timer: number | null = null;

const stopTimer = () => {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
};

const startCooldown = () => {
  cooldown.value = RESEND_COOLDOWN_SECONDS;
  stopTimer();
  timer = window.setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1);
    if (cooldown.value === 0) stopTimer();
  }, 1000);
};

onUnmounted(stopTimer);

const handleResend = async () => {
  resending.value = true;
  try {
    await authService.resendVerification(email.value);
    jaReenviou.value = true;
    startCooldown();
  } catch (err) {
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    resending.value = false;
  }
};

const resendDisabled = computed(() => resending.value || cooldown.value > 0);
const resendLabel = computed(() =>
  cooldown.value > 0 ? `Reenviar em ${cooldown.value}s` : 'Reenviar email',
);
</script>

<template>
  <div class="verificar">
    <RouterLink :to="{ name: 'login' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar ao login</span>
    </RouterLink>

    <div class="verificar__icon">
      <AppIcon name="mail-outline" :size="40" color="var(--primary)" />
    </div>

    <h1 class="verificar__title t-display">Verifique seu email</h1>
    <p class="verificar__subtitle t-body">
      Enviamos um link de confirmação para
      <strong>{{ email }}</strong
      >. Abra sua caixa de entrada e clique no link para ativar sua conta.
    </p>

    <div class="tips-card">
      <p class="tips-card__row t-body">
        <AppIcon name="time-outline" :size="18" color="var(--primary)" />
        <span>O link expira em 24 horas.</span>
      </p>
      <span class="tips-card__divider" />
      <p class="tips-card__row t-body">
        <AppIcon name="alert-circle-outline" :size="18" color="var(--primary)" />
        <span>Não esqueça de olhar a pasta de spam.</span>
      </p>
    </div>

    <p v-if="jaReenviou" class="verificar__hint t-caption">
      <AppIcon name="checkmark-circle" :size="16" color="var(--success)" />
      <span>Se o email estiver cadastrado e pendente, enviamos um novo link.</span>
    </p>

    <div class="verificar__actions">
      <AppButton
        :label="resendLabel"
        :loading="resending"
        :disabled="resendDisabled"
        @click="handleResend"
      />
      <RouterLink :to="{ name: 'login' }" class="verificar__secondary">
        <AppButton label="Já verifiquei, entrar" variant="secondary" />
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.verificar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  text-align: center;
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  color: var(--text-secondary);
}

.verificar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  margin: var(--space-lg) auto 0;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.verificar__title {
  margin-top: var(--space-xs);
  color: var(--text-primary);
}

.verificar__subtitle {
  color: var(--text-secondary);
}

.tips-card {
  margin-top: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  text-align: left;
}

.tips-card__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-block: var(--space-xs);
  color: var(--text-secondary);
}

.tips-card__divider {
  display: block;
  height: 1px;
  background: var(--border);
  margin-block: 2px;
}

.verificar__hint {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  color: var(--text-secondary);
  text-align: left;
}

.verificar__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.verificar__secondary {
  display: block;
}
</style>
