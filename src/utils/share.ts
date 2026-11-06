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
 * `shared`/`cancelled` vêm da folha nativa do sistema e não pedem aviso: ela
 * mesma já foi o retorno. `copied`/`failed` vêm da cópia e pedem um toast.
 */
export type ShareResult = 'shared' | 'cancelled' | CopyResult;

/**
 * Compartilha o evento.
 *
 * Em aparelho de toque com a Web Share API, abre a folha de aplicativos do
 * sistema — no celular é o gesto esperado, e mandar para o WhatsApp sai em um
 * toque em vez de copiar, trocar de app e colar.
 *
 * No resto, copia a mensagem. O `(pointer: coarse)` deixa de fora o desktop,
 * onde a API existe no Safari do macOS e no Edge/Chrome do Windows: lá a folha
 * do sistema atrapalha, e o gesto que o usuário quer é colar o texto na
 * conversa que já está aberta.
 *
 * Fecha a folha sem escolher nada → `AbortError` → `cancelled`, sem aviso.
 * Qualquer outra falha da API cai na cópia, para o usuário não sair sem nada.
 *
 * Fica aqui, e não dentro da tela, porque o mesmo gesto existe em dois lugares
 * — o card da listagem e a barra de ações do detalhe. Com a montagem da
 * mensagem duplicada, a assinatura acabaria divergindo entre os dois.
 */
export const compartilharEvento = async (evento: Evento): Promise<ShareResult> => {
  if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({
        title: evento.titulo,
        // A mensagem inteira, link incluso, vai em `text`, e não há `url`: com
        // os dois, cada destino decide o que aproveitar, e vários (o WhatsApp
        // pela folha do Windows, por exemplo) ficam só com o link. Só com
        // texto, todo app recebe a mesma mensagem da cópia — e o link no meio
        // dela continua clicável.
        text: montarTextoCompartilhamento(evento),
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      console.warn('[share] navigator.share falhou, copiando o texto', err);
    }
  }

  return copyToClipboard(montarTextoCompartilhamento(evento));
};
