import type { Evento } from '@/types';

import { copyToClipboard, type CopyResult } from './platform';

/**
 * Base dos links compartilhados. No `pnpm dev` usa a origem atual
 * (`http://localhost:5173`), para dar para testar o link copiado localmente;
 * no build de produção é sempre o domínio público, mesmo que o site esteja
 * sendo acessado por outro endereço (ex.: o domínio do CloudFront).
 */
const SITE_URL = import.meta.env.DEV ? window.location.origin : 'https://role-sc.com.br';

/**
 * Link direto para a página de detalhes do evento no site (rota
 * `detalhe-evento`). Quem recebe sem estar logado passa pelo login e volta
 * para o evento, via `?redirect=` do guard do router.
 */
export const linkDoEvento = (evento: Evento): string =>
  `${SITE_URL}/evento/${encodeURIComponent(evento._id)}`;

/**
 * Monta a mensagem de compartilhamento de um evento.
 *
 * Aponta para o evento no Rolê SC, e não para a página da prefeitura
 * (`evento.url`): a origem às vezes remove o evento, e o detalhe do site já
 * traz o link da fonte para quem quiser.
 *
 * As linhas são montadas em array e filtradas: eventos sem descrição deixavam
 * duas quebras seguidas no meio do texto quando isto era um template único.
 */
export const montarTextoCompartilhamento = (evento: Evento): string =>
  [
    evento.titulo,
    evento.descricao,
    `Veja no Rolê SC: ${linkDoEvento(evento)}`,
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
