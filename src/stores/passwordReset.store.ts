import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Carrega o `resetToken` entre a tela de confirmação do código e a de nova
 * senha — o equivalente aos route params do stack navigator no mobile.
 *
 * O token fica DELIBERADAMENTE fora da URL: ele autoriza a troca de senha, e
 * URLs vazam por histórico, header Referer e ombro alheio. O efeito colateral
 * é que um F5 na tela de redefinição perde o token e o guard manda o usuário
 * recomeçar — que é exatamente o comportamento correto para um token de uso
 * único com TTL de 15 minutos.
 */
export const usePasswordResetStore = defineStore('passwordReset', () => {
  const email = ref<string | null>(null);
  const resetToken = ref<string | null>(null);

  const start = (userEmail: string) => {
    email.value = userEmail;
    resetToken.value = null;
  };

  const setToken = (token: string) => {
    resetToken.value = token;
  };

  const clear = () => {
    email.value = null;
    resetToken.value = null;
  };

  return { email, resetToken, start, setToken, clear };
});
