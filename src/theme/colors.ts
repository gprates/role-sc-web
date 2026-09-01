/**
 * Paleta do Rolê SC — mesma do app mobile (src/theme/colors.ts).
 *
 * Os valores também vivem como CSS custom properties em `styles/tokens.css`.
 * Este módulo TS existe para o que precisa da cor em JavaScript: gradientes
 * gerados por categoria, cor do `<meta name="theme-color">`, etc.
 */
export const colors = {
  primary: '#1E88E5',
  primaryDark: '#0A65C1',
  primaryLight: '#5EB3F2',

  gradientPrimary: ['#0A65C1', '#5EB3F2'] as const,
  gradientBackground: ['#F0F9FF', '#DBEAFE'] as const,
  gradientAvatar: ['#1E88E5', '#60A5FA'] as const,

  background: '#F0F9FF',
  surface: '#FFFFFF',
  surfaceMuted: '#E6F4FB',

  textPrimary: '#001E3C',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',

  border: '#DBEAFE',
  borderStrong: '#BFDBFE',

  chipBackground: '#DBEAFE',
  chipText: '#1E3A8A',
  chipActiveBackground: '#1E88E5',
  chipActiveText: '#FFFFFF',
  chipDisabledBackground: '#F1F5F9',
  chipDisabledText: '#94A3B8',

  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#0EA5E9',

  heart: '#EF4444',

  shadow: 'rgba(15, 23, 42, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

/**
 * Cores por categoria, usadas no gradiente da capa quando o evento não tem
 * imagem própria (ou quando a imagem do site da prefeitura falha ao carregar).
 */
export const categoryColors: Record<string, readonly [string, string]> = {
  Cultura: ['#7C3AED', '#A855F7'],
  Esporte: ['#16A34A', '#22C55E'],
  Gastronomia: ['#EA580C', '#F97316'],
  Educação: ['#DB2777', '#EC4899'],
  Saúde: ['#DC2626', '#EF4444'],
  'Meio Ambiente': ['#65A30D', '#84CC16'],
  Turismo: ['#0891B2', '#06B6D4'],
  Religião: ['#4F46E5', '#6366F1'],
  Outro: ['#475569', '#64748B'],
};

const FALLBACK_GRADIENT: readonly [string, string] = ['#475569', '#64748B'];

export const getCategoryGradient = (
  categoria: string | null | undefined,
): readonly [string, string] => {
  if (!categoria) return categoryColors.Outro ?? FALLBACK_GRADIENT;
  return categoryColors[categoria] ?? categoryColors.Outro ?? FALLBACK_GRADIENT;
};

export const getCategorySolid = (categoria: string | null | undefined): string =>
  getCategoryGradient(categoria)[1];

/** Gradiente CSS pronto para uso em `background`. */
export const getCategoryGradientCss = (
  categoria: string | null | undefined,
): string => {
  const [from, to] = getCategoryGradient(categoria);
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
};
