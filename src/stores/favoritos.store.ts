import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { extractErrorMessage } from '@/services/api';
import { favoritosService } from '@/services/favoritos.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Evento, Pagination } from '@/types';
import { PAGE_SIZE } from '@/utils/constants';

/**
 * Favoritos do usuário logado — porte do `FavoritosContext` do app mobile.
 *
 * Duas fontes de verdade, de propósito:
 *   · `ids`       — todos os favoritos, sem paginação (GET /favoritos/ids).
 *                   É quem responde "este coração está cheio?", e precisa ser
 *                   completo: a Home pode mostrar um evento da página 5 dos
 *                   favoritos, que a lista paginada abaixo nem carregou.
 *   · `favoritos` — a lista paginada de eventos, que só a tela de Favoritos usa.
 *
 * O store é global porque Home, Detalhe e Favoritos mostram o MESMO coração —
 * favoritar em qualquer uma reflete nas outras na hora, sem refetch.
 */
export const useFavoritosStore = defineStore('favoritos', () => {
  const auth = useAuthStore();

  const ids = ref<Set<string>>(new Set());
  const favoritos = ref<Evento[]>([]);
  const pagination = ref<Pagination | null>(null);
  const loading = ref(false);
  const refreshing = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

  /** Quantidade real de favoritos, não o tamanho da página carregada. */
  const total = computed(() => pagination.value?.total ?? favoritos.value.length);

  const hasMore = computed(() => {
    const p = pagination.value;
    return p !== null && p.page < p.totalPages;
  });

  // Descarta respostas de requisições superadas (ex.: troca de usuário no meio
  // de um fetch), no mesmo espírito do useEventos.
  let requestId = 0;

  const fetchPage = async (page: number, mode: 'initial' | 'refresh' | 'more') => {
    const myRequestId = ++requestId;

    loading.value = mode === 'initial';
    refreshing.value = mode === 'refresh';
    loadingMore.value = mode === 'more';
    error.value = null;

    try {
      // Na primeira página vale re-sincronizar os ids também: é o momento em
      // que o site pode estar desatualizado (favoritado pelo app, outra aba).
      const [res, idsRes] = await Promise.all([
        favoritosService.list({ page, limit: PAGE_SIZE }),
        mode === 'more' ? Promise.resolve(null) : favoritosService.listIds(),
      ]);
      if (myRequestId !== requestId) return;

      favoritos.value = mode === 'more' ? [...favoritos.value, ...res.data] : res.data;
      pagination.value = res.pagination;
      if (idsRes) ids.value = new Set(idsRes);
    } catch (err) {
      if (myRequestId !== requestId) return;
      error.value = extractErrorMessage(err);
    } finally {
      if (myRequestId === requestId) {
        loading.value = false;
        refreshing.value = false;
        loadingMore.value = false;
      }
    }
  };

  const reset = () => {
    requestId++;
    ids.value = new Set();
    favoritos.value = [];
    pagination.value = null;
    error.value = null;
    loading.value = false;
    refreshing.value = false;
    loadingMore.value = false;
  };

  /**
   * Carrega ao logar e ZERA ao deslogar.
   *
   * O gatilho é o token, e não uma chamada em `main.ts`: os favoritos agora são
   * do usuário, então buscá-los antes de existir sessão daria 401 — e mantê-los
   * depois do logout deixaria os favoritos de uma pessoa na tela da seguinte.
   */
  watch(
    () => auth.token,
    (token) => {
      if (!token) {
        reset();
        return;
      }
      void fetchPage(1, 'initial');
    },
    { immediate: true },
  );

  const refresh = async (): Promise<void> => {
    if (!auth.token) return;
    await fetchPage(1, 'refresh');
  };

  const loadMore = async (): Promise<void> => {
    if (loading.value || loadingMore.value || refreshing.value) return;
    if (!hasMore.value || !pagination.value) return;
    await fetchPage(pagination.value.page + 1, 'more');
  };

  const isFavorito = (id: string): boolean => ids.value.has(id);

  /** Aplica o novo estado na UI (ids + lista) sem tocar na API. */
  const applyLocal = (evento: Evento, favorito: boolean) => {
    // Set novo, e não `.add()` no atual: Vue não rastreia mutação de Set num
    // `ref`, então o coração não repintaria.
    const next = new Set(ids.value);
    if (favorito) next.add(evento._id);
    else next.delete(evento._id);
    ids.value = next;

    if (!favorito) {
      favoritos.value = favoritos.value.filter((e) => e._id !== evento._id);
    } else if (!favoritos.value.some((e) => e._id === evento._id)) {
      // Backend ordena por data de criação desc, então o recém-favoritado entra
      // no topo — mesma posição que teria depois de um refresh.
      favoritos.value = [evento, ...favoritos.value];
    }

    if (pagination.value) {
      const novoTotal = Math.max(pagination.value.total + (favorito ? 1 : -1), 0);
      pagination.value = {
        ...pagination.value,
        total: novoTotal,
        totalPages: Math.max(Math.ceil(novoTotal / pagination.value.limit), 1),
      };
    }
  };

  /**
   * Alterna o favorito e devolve o estado final. Otimista: o coração responde
   * no clique e volta atrás se a API recusar, para a UI não mentir sobre o que
   * está gravado no servidor.
   */
  const toggle = async (evento: Evento): Promise<boolean> => {
    const anterior = ids.value.has(evento._id);
    const alvo = !anterior;

    applyLocal(evento, alvo);

    try {
      if (alvo) await favoritosService.add(evento._id);
      else await favoritosService.remove(evento._id);
      return alvo;
    } catch (err) {
      applyLocal(evento, anterior);
      error.value = extractErrorMessage(err);
      throw err;
    }
  };

  return {
    favoritos,
    ids,
    pagination,
    loading,
    refreshing,
    loadingMore,
    error,
    total,
    hasMore,
    isFavorito,
    toggle,
    refresh,
    loadMore,
  };
});
