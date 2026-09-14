/**
 * Leitura do `exp` do JWT, só para saber se a sessão local já venceu.
 *
 * NÃO é validação: a assinatura continua sendo conferida pelo backend, e um
 * token que passe por aqui pode muito bem tomar 401. O objetivo é o contrário
 * — pegar o caso óbvio (token expirado guardado no localStorage) ANTES de
 * navegar, para o usuário cair direto no login em vez de abrir a tela do
 * evento, esperar a request e receber um "Token inválido" sem saída.
 *
 * Qualquer token com formato inesperado é tratado como válido: na dúvida,
 * deixa o backend decidir — o handler de 401 cobre o resto.
 */

/** Folga para relógio dessincronizado do celular e latência da request. */
const SKEW_MS = 30_000;

const decodePayload = (token: string): Record<string, unknown> | null => {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    // base64url → base64, com o padding que o atob exige.
    const base64 = partes[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const isTokenExpirado = (token: string | null | undefined): boolean => {
  if (!token) return true;

  const payload = decodePayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;

  return exp * 1000 <= Date.now() + SKEW_MS;
};
