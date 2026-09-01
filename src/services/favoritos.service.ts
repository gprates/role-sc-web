import type { Evento } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { storage } from '@/utils/storage';

/**
 * Favoritos 100% locais, via localStorage (RN21 — sem sincronização entre
 * dispositivos no MVP; no app mobile o equivalente é o AsyncStorage).
 *
 * A interface devolve `Evento[]`, o mesmo shape que um endpoint server-side
 * devolveria, para que trocar por chamadas à API no futuro não exija tocar
 * em nenhuma tela.
 */
export const favoritosService = {
  async list(): Promise<Evento[]> {
    const list = await storage.get<Evento[]>(STORAGE_KEYS.favoritos);
    return list ?? [];
  },

  async isFavorito(id: string): Promise<boolean> {
    const list = await favoritosService.list();
    return list.some((e) => e._id === id);
  },

  async add(evento: Evento): Promise<Evento[]> {
    const list = await favoritosService.list();
    if (list.some((e) => e._id === evento._id)) return list;
    const updated = [evento, ...list];
    await storage.set(STORAGE_KEYS.favoritos, updated);
    return updated;
  },

  async remove(id: string): Promise<Evento[]> {
    const list = await favoritosService.list();
    const updated = list.filter((e) => e._id !== id);
    await storage.set(STORAGE_KEYS.favoritos, updated);
    return updated;
  },

  async toggle(evento: Evento): Promise<{ favorito: boolean; lista: Evento[] }> {
    const list = await favoritosService.list();
    const exists = list.some((e) => e._id === evento._id);
    if (exists) {
      const lista = await favoritosService.remove(evento._id);
      return { favorito: false, lista };
    }
    const lista = await favoritosService.add(evento);
    return { favorito: true, lista };
  },
};
