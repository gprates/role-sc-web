import type { Evento } from '@/types';

import { copyToClipboard, type CopyResult } from './platform';

/** Endereço público do site, na assinatura da mensagem. */
const SITE_URL = 'https://role-sc.com.br';

/**
 * Monta a mensagem de compartilhamento de um evento.
 *
 * Mesmo texto do app (`share.ts` do mobile), trocando só a assinatura final:
 * lá é "Compartilhado pelo app Rolê SC", aqui aponta para o site.
 *
 * As linhas são montadas em array e filtradas: eventos sem descrição deixavam
 * duas quebras seguidas no meio do texto quando isto era um template único.
 */
export const montarTextoCompartilhamento = (evento: Evento): string =>
  [
    evento.titulo,
    evento.descricao,
    `Veja mais: ${evento.url}`,
    `Compartilhado através do website do Rolê SC: ${SITE_URL}`,
  ]
    .filter(Boolean)
    .join('\n\n');

/**
 * Copia a mensagem do evento para a área de transferência.
 *
 * Deliberadamente NÃO usa a Web Share API. Ela abriria a folha de aplicativos
 * do sistema, que é o comportamento certo num celular mas atrapalha no
 * desktop — onde ela nem existe no Chrome e no Firefox, e onde o gesto que o
 * usuário realmente quer é colar o texto na conversa que já está aberta.
 * Copiar sempre deixa o resultado igual nas duas pontas.
 *
 * Fica aqui, e não dentro da tela, porque o mesmo gesto existe em dois lugares
 * — o card da listagem e a barra de ações do detalhe. Com a montagem da
 * mensagem duplicada, a assinatura acabaria divergindo entre os dois.
 */
export const compartilharEvento = async (evento: Evento): Promise<CopyResult> =>
  copyToClipboard(montarTextoCompartilhamento(evento));
