import { computed, ref, watch, type Ref } from 'vue';

import { extractErrorMessage } from '@/services/api';
import { comentariosService } from '@/services/comentarios.service';
import type { Comentario, Pagination } from '@/types';

const PAGE_LIMIT = 20;

/**
 * Concatena a próxima página descartando ids que já estão na lista.
 *
 * A paginação é por OFFSET (`skip`) sobre uma lista ordenada do mais novo para
 * o mais antigo, então publicar um comentário empurra todo mundo uma posição
 * para baixo: o item que era o último da página 1 vira o primeiro da página 2 e
 * voltaria repetido — item duplicado na tela e chave `v-for` repetida.
 */
const juntarSemRepetir = (atuais: Comentario[], novos: Comentario[]): Comentario[] => {
  const jaTem = new Set(atuais.map((c) => c._id));
  return [...atuais, ...novos.filter((c) => !jaTem.has(c._id))];
};

/**
 * Estado da lista de comentários de UM evento — porte do hook `useComentarios`
 * do app mobile.
 *
 * Diferente dos favoritos, isto não precisa de store global: comentários só
 * aparecem na tela de detalhe, então o estado pode morrer junto com ela. A tela
 * monta o composable e usa tanto o `total` (para o contador da barra de ações,
 * que precisa do número mesmo com o modal fechado) quanto as ações (para o
 * modal).
 *
 * Criar/editar/excluir/curtir são otimistas onde dá, com uma exceção: o item
 * criado só entra na lista com a resposta do servidor, porque é ela que traz o
 * `_id` real — sem ele o usuário poderia tentar curtir ou excluir um comentário
 * que ainda não existe no banco.
 */
export const useComentarios = (eventoId: Ref<string>) => {
  const comentarios = ref<Comentario[]>([]);
  const pagination = ref<Pagination | null>(null);
  const loading = ref(true);
  const refreshing = ref(false);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

  /**
   * Total de comentários do evento — vem de `pagination.total`, então conta
   * TODOS e não só os que já foram carregados.
   */
  const total = computed(() => pagination.value?.total ?? comentarios.value.length);

  const hasMore = computed(() => {
    const p = pagination.value;
    return p !== null && p.page < p.totalPages;
  });

  let requestId = 0;

  const fetchPage = async (page: number, mode: 'initial' | 'refresh' | 'more') => {
    const myRequestId = ++requestId;

    loading.value = mode === 'initial';
    refreshing.value = mode === 'refresh';
    loadingMore.value = mode === 'more';
    error.value = null;

    try {
      const res = await comentariosService.list(eventoId.value, {
        page,
        limit: PAGE_LIMIT,
      });
      if (myRequestId !== requestId) return;

      comentarios.value =
        mode === 'more' ? juntarSemRepetir(comentarios.value, res.data) : res.data;
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

  watch(
    eventoId,
    () => {
      comentarios.value = [];
      pagination.value = null;
      void fetchPage(1, 'initial');
    },
    { immediate: true },
  );

  const refresh = () => fetchPage(1, 'refresh');

  const loadMore = async (): Promise<void> => {
    if (loading.value || loadingMore.value || refreshing.value) return;
    if (!hasMore.value || !pagination.value) return;
    await fetchPage(pagination.value.page + 1, 'more');
  };

  /** Ajusta `total`/`totalPages` quando entra ou sai um item da lista. */
  const shiftTotal = (delta: 1 | -1) => {
    const p = pagination.value;
    if (!p) return;
    const novoTotal = Math.max(p.total + delta, 0);
    pagination.value = {
      ...p,
      total: novoTotal,
      totalPages: Math.max(Math.ceil(novoTotal / p.limit), 1),
    };
  };

  const criar = async (texto: string): Promise<void> => {
    // Sem otimismo aqui: o `_id` só existe depois da resposta.
    const res = await comentariosService.create(eventoId.value, texto);
    comentarios.value = [res.data, ...comentarios.value];
    shiftTotal(1);
  };

  const editar = async (comentarioId: string, texto: string): Promise<void> => {
    const res = await comentariosService.update(comentarioId, texto);
    comentarios.value = comentarios.value.map((c) =>
      c._id === comentarioId ? res.data : c,
    );
  };

  const excluir = async (comentarioId: string): Promise<void> => {
    // Otimista: o comentário some na hora e volta se a API recusar. Sem isso
    // ele ficaria na tela durante o round-trip, dando a impressão de que o
    // clique não funcionou.
    const indice = comentarios.value.findIndex((c) => c._id === comentarioId);
    if (indice === -1) return;
    const removido = comentarios.value[indice];
    if (!removido) return;

    comentarios.value = comentarios.value.filter((c) => c._id !== comentarioId);
    shiftTotal(-1);

    try {
      await comentariosService.remove(comentarioId);
    } catch (err) {
      const restaurada = [...comentarios.value];
      restaurada.splice(indice, 0, removido);
      comentarios.value = restaurada;
      shiftTotal(1);
      throw err;
    }
  };

  const toggleCurtida = async (comentario: Comentario): Promise<void> => {
    const alvo = !comentario.curtidoPorMim;

    const aplicar = (curtido: boolean, curtidas: number) => {
      comentarios.value = comentarios.value.map((c) =>
        c._id === comentario._id ? { ...c, curtidoPorMim: curtido, curtidas } : c,
      );
    };

    // Otimista: o coração e o número reagem no clique.
    aplicar(alvo, Math.max(comentario.curtidas + (alvo ? 1 : -1), 0));

    try {
      // A resposta traz o contador REAL — outra pessoa pode ter curtido no meio
      // do caminho, então o palpite otimista é substituído pelo do servidor em
      // vez de ficar por cima dele.
      const res = alvo
        ? await comentariosService.curtir(comentario._id)
        : await comentariosService.descurtir(comentario._id);
      aplicar(res.data.curtidoPorMim, res.data.curtidas);
    } catch (err) {
      aplicar(comentario.curtidoPorMim, comentario.curtidas);
      throw err;
    }
  };

  return {
    comentarios,
    pagination,
    loading,
    refreshing,
    loadingMore,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    criar,
    editar,
    excluir,
    toggleCurtida,
  };
};
