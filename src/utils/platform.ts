/**
 * Equivalentes web das APIs nativas usadas pelo app mobile.
 */

export type CopyResult = 'copied' | 'failed';

/**
 * Copia texto para a área de transferência.
 *
 * `navigator.clipboard` só existe em contexto seguro (HTTPS ou localhost) e
 * pode ser negado por permissão. O fallback com `execCommand('copy')` é
 * obsoleto, mas continua funcionando em todos os navegadores atuais e é a
 * diferença entre o usuário sair com o texto na mão ou com um aviso de erro.
 */
export const copyToClipboard = async (text: string): Promise<CopyResult> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch (err) {
      console.warn('[share] clipboard indisponível, tentando execCommand', err);
    }
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    // Fora da tela e não-editável: o campo não pode piscar na página nem
    // abrir o teclado no celular durante o instante em que existe.
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok ? 'copied' : 'failed';
  } catch (err) {
    console.warn('[share] execCommand falhou', err);
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
