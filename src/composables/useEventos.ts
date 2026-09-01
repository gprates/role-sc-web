import { ref, watch, type Ref } from 'vue';

import { extractErrorMessage } from '@/services/api';
import { eventoService } from '@/services/evento.service';
import type { Evento, EventosFilter, Pagination } from '@/types';
import { PAGE_SIZE } from '@/utils/constants';

/**
 * Listagem de eventos com paginação, "carregar mais" e refresh.
 * Porte direto do hook `useEventos` do app mobile.
 *
 * Reexecuta sozinho sempre que `filter` muda. O `requestId` descarta respostas
 * de requisições que já foram superadas — sem isso, digitar rápido na busca faz
 * uma resposta antiga chegar depois da nova e sobrescrever a lista correta.
 */
export const useEventos = (filter: Ref<EventosFilter>) => {
  const eventos = ref<Evento[]>([]);
  const loading = ref(true);
  const refreshing = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination | null>(null);

  let requestId = 0;

  const fetchPage = async (page: number, mode: 'initial' | 'refresh' | 'more') => {
    const myRequestId = ++requestId;

    loading.value = mode === 'initial';
    refreshing.value = mode === 'refresh';
    loadingMore.value = mode === 'more';
    error.value = null;

    try {
      const res = await eventoService.list({ ...filter.value, page, limit: PAGE_SIZE });
      if (myRequestId !== requestId) return;

      eventos.value = mode === 'more' ? [...eventos.value, ...res.data] : res.data;
      pagination.value = res.pagination;
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

  const refresh = () => fetchPage(1, 'refresh');

  const loadMore = async () => {
    if (loading.value || loadingMore.value || refreshing.value) return;
    const current = pagination.value;
    if (!current) return;
    if (current.page >= current.totalPages) return;
    await fetchPage(current.page + 1, 'more');
  };

  watch(
    filter,
    () => {
      void fetchPage(1, 'initial');
    },
    { immediate: true, deep: true },
  );

  return { eventos, loading, refreshing, loadingMore, error, pagination, refresh, loadMore };
};
