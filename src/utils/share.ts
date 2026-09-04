import type { Evento } from '@/types';

import { shareOrCopy, type ShareResult } from './platform';

/**
 * Compartilha um evento.
 *
 * Fica aqui, e não dentro da tela, porque o mesmo gesto existe em dois lugares
 * — o card da listagem e a barra de ações do detalhe. Com a montagem da
 * mensagem duplicada, a assinatura acabaria divergindo entre os dois.
 *
 * As linhas são montadas em array e filtradas: eventos sem descrição deixavam
 * duas quebras seguidas no meio do texto quando isto era um template único.
 */
export const compartilharEvento = async (evento: Evento): Promise<ShareResult> => {
  const linhas = [
    evento.titulo,
    evento.descricao,
    'Compartilhado pelo Rolê SC',
  ].filter(Boolean);

  return shareOrCopy({
    title: evento.titulo,
    text: linhas.join('\n\n'),
    url: evento.url,
  });
};
