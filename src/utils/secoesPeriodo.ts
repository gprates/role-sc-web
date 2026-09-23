import type { Evento } from '@/types';

import { addDays, getEstaSemanaRange, getProximaSemanaRange, startOfDay } from './dateRange';

/**
 * Agrupa a listagem "Por vir" em seções de período (Hoje, Em cartaz, Esta
 * semana, Este fim de semana, Semana que vem e Demais eventos), para o
 * usuário enxergar de cara o que está perto e o que ainda vai demorar — antes, um evento de dezembro no meio
 * da grade parecia tão "atual" quanto um de amanhã.
 *
 * As datas do backend são só o dia (meia-noite UTC), por isso o dia do evento
 * sai dos componentes UTC — mesma convenção do `formatCardDate` — e é
 * comparado com o "hoje" no horário local do usuário.
 */
export interface SecaoPeriodo {
  key: string;
  label: string;
  eventos: Evento[];
}

/** Dia do evento como Date LOCAL à meia-noite, ou null se não houver data. */
const diaDoEvento = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** Sexta-feira do fim de semana corrente (se hoje é sáb/dom, a que passou). */
const sextaDaSemana = (hoje: Date): Date => {
  const dia = hoje.getDay(); // 0=domingo..6=sábado
  const diff = dia === 0 ? -2 : 5 - dia;
  return addDays(hoje, diff);
};

interface Classificacao {
  key: string;
  label: string;
  /** Posição da seção na tela. */
  ordem: number;
}

/** Tudo depois da semana que vem (e os eventos sem data) numa seção só. */
const DEMAIS: Classificacao = { key: 'demais', label: 'Demais eventos', ordem: 5 };

const classificar = (evento: Evento, hoje: Date): Classificacao => {
  const inicio = diaDoEvento(evento.dataInicio);
  if (!inicio) return DEMAIS;

  const t = inicio.getTime();
  if (t === hoje.getTime()) return { key: 'hoje', label: 'Hoje', ordem: 0 };
  if (t < hoje.getTime()) return { key: 'em-cartaz', label: 'Em cartaz', ordem: 1 };

  const semana = getEstaSemanaRange(hoje);
  if (t <= semana.to.getTime()) {
    return t < sextaDaSemana(hoje).getTime()
      ? { key: 'esta-semana', label: 'Esta semana', ordem: 2 }
      : { key: 'fim-de-semana', label: 'Este fim de semana', ordem: 3 };
  }

  if (t <= getProximaSemanaRange(hoje).to.getTime()) {
    return { key: 'proxima-semana', label: 'Semana que vem', ordem: 4 };
  }

  return DEMAIS;
};

/**
 * A ordem das seções é fixa (não depende da ordem em que a API devolve os
 * eventos); dentro de cada seção a ordem da API é preservada. Seções vazias
 * não aparecem.
 */
export const agruparPorPeriodo = (eventos: Evento[], agora: Date = new Date()): SecaoPeriodo[] => {
  const hoje = startOfDay(agora);
  const secoes = new Map<string, SecaoPeriodo & { ordem: number }>();

  for (const evento of eventos) {
    const { key, label, ordem } = classificar(evento, hoje);
    let secao = secoes.get(key);
    if (!secao) {
      secao = { key, label, ordem, eventos: [] };
      secoes.set(key, secao);
    }
    secao.eventos.push(evento);
  }

  return [...secoes.values()]
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ key, label, eventos: lista }) => ({ key, label, eventos: lista }));
};
