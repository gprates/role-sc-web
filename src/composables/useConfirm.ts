import { ref } from 'vue';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta o botão de confirmação de vermelho (logout, exclusões). */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Substituto web do `Alert.alert` com botões de ação do React Native.
 *
 * Diferente do `Alert.alert`, que recebe callbacks, aqui a chamada devolve uma
 * Promise<boolean> — o que deixa o código das telas linear:
 *
 *   if (!(await confirm({ title: 'Sair?' }))) return;
 *   await signOut();
 */
const pending = ref<PendingConfirm | null>(null);

const confirm = (options: ConfirmOptions): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    pending.value = { ...options, resolve };
  });

const answer = (value: boolean) => {
  pending.value?.resolve(value);
  pending.value = null;
};

export const useConfirm = () => ({ pending, confirm, answer });
