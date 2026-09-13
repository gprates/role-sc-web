/**
 * Constantes fixas do site — devem ficar em sincronia com o backend
 * (CATEGORIAS_VALIDAS do NLP Processor / API) e com o app mobile.
 */

/**
 * Os 6 municípios-alvo do TCC.
 *
 * A API retorna via `GET /municipios` apenas os que já têm eventos crawleados,
 * mas os chips mostram sempre os 6 para uma UX consistente (RN04).
 *
 * NOTA: o app mobile ainda lista só 5 — Balneário Camboriú está faltando lá,
 * apesar de já haver eventos dele no banco. Aqui a lista está correta.
 */
export const MUNICIPIOS_FIXOS = [
  'Itajaí',
  'Camboriú',
  'Balneário Camboriú',
  'Porto Belo',
  'Itapema',
  'Bombinhas',
] as const;

export type Municipio = (typeof MUNICIPIOS_FIXOS)[number];

/**
 * Categorias válidas — espelha o array CATEGORIAS_VALIDAS do NLP Processor/API.
 */
export const CATEGORIAS = [
  'Cultura',
  'Esporte',
  'Gastronomia',
  'Educação',
  'Saúde',
  'Meio Ambiente',
  'Turismo',
  'Religião',
  'Outro',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Chaves do localStorage. Mesmos nomes do AsyncStorage no app mobile — não
 * há compartilhamento entre as plataformas, mas manter o padrão facilita
 * inspecionar os dois lados durante o desenvolvimento.
 */
export const STORAGE_KEYS = {
  token: '@rolesc/token',
  user: '@rolesc/user',
  /** Destino pós-login que precisa sobreviver ao cadastro (ver utils/redirect.ts). */
  redirectPendente: '@rolesc/redirect-pendente',
  // `favoritos` saiu daqui: eles agora são do usuário e vivem no backend
  // (GET/POST/DELETE /favoritos), não mais no localStorage do navegador.
} as const;

export const APP_VERSION = '1.0.0';

/** Itens por página na listagem de eventos (limite máximo do backend é 50). */
export const PAGE_SIZE = 20;
