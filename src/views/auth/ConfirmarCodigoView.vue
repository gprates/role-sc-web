<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';
import AppIcon from '@/components/AppIcon.vue';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { authService, getApiErrorCode } from '@/services/auth.service';
import { usePasswordResetStore } from '@/stores/passwordReset.store';
import { API_ERROR_CODES } from '@/types';

/**
 * T05 — Recuperar senha, etapa 2 de 3 (porte de ConfirmarCodigoScreen.tsx).
 *
 * A técnica visual é a mesma do app: UM input real, invisível, capturando toda
 * a digitação, e 6 "células" que só desenham o caractere correspondente. Bem
 * mais simples que 6 inputs com auto-focus encadeado, e de quebra permite
 * colar o código inteiro de uma vez.
 */
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const route = useRoute();
const router = useRouter();
const toast = useToast();
const resetStore = usePasswordResetStore();

const email = computed(() => {
  if (typeof route.query.email === 'string') return route.query.email;
  return resetStore.email ?? '';
});

const code = ref('');
const submitting = ref(false);
const resending = ref(false);
// Começa já em cooldown: o usuário acabou de receber o email na tela anterior.
const cooldown = ref(RESEND_COOLDOWN_SECONDS);
const inputEl = ref<HTMLInputElement | null>(null);
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

onMounted(() => {
  inputEl.value?.focus();
  startCooldown();
});

onUnmounted(stopTimer);

const onInput = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value;
  code.value = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
};

const handleSubmit = async () => {
  if (code.value.length !== CODE_LENGTH) {
    toast.error('Atenção', `Digite os ${CODE_LENGTH} dígitos do código.`);
    return;
  }

  submitting.value = true;
  try {
    const res = await authService.verifyResetCode(email.value, code.value);
    resetStore.start(email.value);
    resetStore.setToken(res.resetToken);
    await router.push({ name: 'redefinir-senha' });
  } catch (err) {
    if (getApiErrorCode(err) === API_ERROR_CODES.INVALID_RESET_CODE) {
      toast.error(
        'Código inválido',
        'O código informado está incorreto ou expirou. Solicite um novo se necessário.',
      );
      code.value = '';
      inputEl.value?.focus();
      return;
    }
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
};

const handleResend = async () => {
  resending.value = true;
  try {
    await authService.forgotPassword(email.value);
    toast.success('Código reenviado', 'Cheque sua caixa de entrada novamente.');
    startCooldown();
  } catch (err) {
    toast.error('Erro', extractErrorMessage(err));
  } finally {
    resending.value = false;
  }
};

const cells = computed(() =>
  Array.from({ length: CODE_LENGTH }, (_, i) => ({
    char: code.value[i] ?? '',
    filled: Boolean(code.value[i]),
    focused: i === code.value.length,
  })),
);

const resendDisabled = computed(() => resending.value || cooldown.value > 0);
const resendLabel = computed(() =>
  cooldown.value > 0 ? `Reenviar em ${cooldown.value}s` : 'Reenviar código',
);
</script>

<template>
  <div class="confirmar">
    <RouterLink :to="{ name: 'recuperar-senha' }" class="back-link t-body">
      <AppIcon name="arrow-back" :size="20" />
      <span>Voltar</span>
    </RouterLink>

    <header class="confirmar__header">
      <h1 class="t-display">Confirme o código</h1>
      <p class="confirmar__subtitle t-body">
        Enviamos um código de 6 dígitos para <strong>{{ email }}</strong
        >. Digite-o abaixo para continuar.
      </p>
    </header>

    <!-- As células são decorativas; o input abaixo é quem recebe o teclado. -->
    <div class="cells" aria-hidden="true" @click="inputEl?.focus()">
      <div
        v-for="(cell, index) in cells"
        :key="index"
        class="cell"
        :class="{ 'cell--filled': cell.filled, 'cell--focused': cell.focused }"
      >
        {{ cell.char }}
      </div>
    </div>

    <input
      ref="inputEl"
      class="hidden-input"
      :value="code"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="CODE_LENGTH"
      aria-label="Código de 6 dígitos recebido por email"
      @input="onInput"
      @keyup.enter="handleSubmit"
    />

    <div class="confirmar__actions">
      <AppButton
        label="Confirmar"
        :loading="submitting"
        :disabled="code.length !== CODE_LENGTH"
        @click="handleSubmit"
      />
      <button
        type="button"
        class="confirmar__resend t-body-bold"
        :class="{ 'confirmar__resend--disabled': resendDisabled }"
        :disabled="resendDisabled"
        @click="handleResend"
      >
        {{ resendLabel }}
      </button>
    </div>

    <div class="tips-card">
      <p class="tips-card__row t-body">
        <AppIcon name="time-outline" :size="18" color="var(--primary)" />
        <span>O código expira em 15 minutos.</span>
      </p>
      <span class="tips-card__divider" />
      <p class="tips-card__row t-body">
        <AppIcon name="alert-circle-outline" :size="18" color="var(--primary)" />
        <span>Não esqueça de olhar a pasta de spam.</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.confirmar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  color: var(--text-secondary);
}

.confirmar__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.confirmar__subtitle {
  color: var(--text-secondary);
}

.cells {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-xs);
  margin-top: var(--space-xs);
  cursor: text;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 0.85;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.cell--filled {
  border-color: var(--primary);
}

.cell--focused {
  border-color: var(--primary);
  border-width: 2px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent);
}

/**
 * O input precisa continuar focável (e portanto renderizado), então não pode
 * usar `display: none` nem `visibility: hidden` — ambos o tirariam da ordem de
 * foco. Um retângulo de 1px transparente resolve.
 */
.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  border: none;
  padding: 0;
}

.confirmar__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.confirmar__resend {
  align-self: center;
  padding: var(--space-xs) var(--space-md);
  color: var(--primary);
}

.confirmar__resend--disabled {
  color: var(--text-muted);
}

.tips-card {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
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
</style>
