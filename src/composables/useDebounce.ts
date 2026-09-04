import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/**
 * Espelha `source` num ref que só acompanha depois de `delay` ms parados.
 * Porte do hook `useDebounce` do app mobile.
 *
 * Usado pela busca da Home e pela busca dentro dos modais de filtro, para que
 * digitar não dispare uma requisição (ou um refiltro da lista) por tecla.
 */
export const useDebounce = <T>(source: Ref<T>, delay = 400): Ref<T> => {
  const debounced = ref(source.value) as Ref<T>;
  let timer: number | null = null;

  const clear = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };

  watch(source, (value) => {
    clear();
    timer = window.setTimeout(() => {
      debounced.value = value;
    }, delay);
  });

  onBeforeUnmount(clear);

  return debounced;
};
