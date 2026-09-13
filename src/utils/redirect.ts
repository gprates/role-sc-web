import { STORAGE_KEYS } from './constants';
import { storage } from './storage';

/**
 * Destino pendente pós-login — ex.: o evento de um link compartilhado.
 *
 * Quem abre `/evento/:id` sem sessão cai no login com `?redirect=`. Isso basta
 * para quem já tem conta, mas não para quem precisa se cadastrar: o fluxo passa
 * por cadastro → verificar email → link no email (página da API, que não volta
 * para o site) → login, muitas vezes em outra aba ou horas depois. A query se
 * perde no caminho, então o destino também fica no localStorage.
 *
 * A validade acompanha a do link de verificação (24h): depois disso o usuário
 * provavelmente nem lembra do evento, e cair nele num login qualquer confunde.
 */
const VALIDADE_MS = 24 * 60 * 60 * 1000;

interface Pendente {
  path: string;
  expiraEm: number;
}

/**
 * Só caminhos internos (`/evento/123`). Bloqueia `//outro-site.com` e URLs
 * absolutas, para o parâmetro não virar um open redirect.
 */
const isPathInterno = (path: unknown): path is string =>
  typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');

export const salvarRedirectPendente = async (path: string): Promise<void> => {
  if (!isPathInterno(path)) return;
  await storage.set<Pendente>(STORAGE_KEYS.redirectPendente, {
    path,
    expiraEm: Date.now() + VALIDADE_MS,
  });
};

/**
 * Resolve para onde ir depois de autenticar e limpa o pendente. A query da URL
 * atual tem prioridade (é o destino mais recente); o storage cobre o caso em
 * que ela se perdeu no cadastro.
 */
export const consumirRedirect = async (queryRedirect: unknown): Promise<string | null> => {
  const salvo = await storage.get<Pendente>(STORAGE_KEYS.redirectPendente);
  await storage.remove(STORAGE_KEYS.redirectPendente);

  if (isPathInterno(queryRedirect)) return queryRedirect;
  if (salvo && salvo.expiraEm > Date.now() && isPathInterno(salvo.path)) return salvo.path;
  return null;
};
