/**
 * Equivalentes web das APIs nativas usadas pelo app mobile.
 */

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * Equivalente ao `Share.share` do React Native.
 *
 * A Web Share API existe em praticamente todo mobile e no Safari, mas ainda
 * falta no Firefox e no Chrome desktop — nesses casos copiamos o link para a
 * área de transferência, que é o gesto que o usuário ia fazer de qualquer jeito.
 *
 * Só funciona em contexto seguro (HTTPS ou localhost).
 */
export const shareOrCopy = async (payload: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareResult> => {
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      // AbortError = o usuário fechou a folha de compartilhamento. Não é falha.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
      console.warn('[share] navigator.share falhou, tentando clipboard', err);
    }
  }

  try {
    await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
    return 'copied';
  } catch (err) {
    console.warn('[share] clipboard indisponível', err);
    return 'failed';
  }
};

/**
 * Equivalente ao `WebBrowser.openBrowserAsync`. No mobile abre um Custom Tab
 * dentro do app; na web, uma aba nova.
 *
 * `noopener,noreferrer` é obrigatório: sem `noopener` a página aberta ganha
 * acesso a `window.opener` e pode redirecionar a nossa aba (tabnabbing).
 */
export const openExternal = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
