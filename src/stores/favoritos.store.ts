import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { favoritosService } from '@/services/favoritos.service';
import type { Evento } from '@/types';

/**
 * Favoritos locais, reativos.
 *
 * No app mobile isso é o hook `useFavoritos`, e cada tela mantém a própria
 * cópia do estado — por isso o mobile precisa de `useFocusEffect` para
 * recarregar a lista ao voltar para a aba. Aqui um store global resolve:
 * favoritar na home reflete instantaneamente na página de favoritos.
 */
export const useFavoritosStore = defineStore('favoritos', () => {
  const favoritos = ref<Evento[]>([]);
  const loading = ref(true);

  const total = computed(() => favoritos.value.length);

  const refresh = async (): Promise<void> => {
    favoritos.value = await favoritosService.list();
    loading.value = false;
  };

  const isFavorito = (id: string): boolean =>
    favoritos.value.some((e) => e._id === id);

  const toggle = async (evento: Evento): Promise<boolean> => {
    const { favorito, lista } = await favoritosService.toggle(evento);
    favoritos.value = lista;
    return favorito;
  };

  return { favoritos, loading, total, refresh, isFavorito, toggle };
});
