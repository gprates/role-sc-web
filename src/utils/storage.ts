/**
 * Wrapper tipado do localStorage com serialização JSON automática.
 *
 * A interface é assíncrona de propósito: no app mobile a mesma camada usa
 * AsyncStorage (que é async por natureza). Manter as duas assinaturas iguais
 * permite que `favoritos.service.ts` e o store de auth sejam praticamente
 * idênticos nas duas plataformas.
 *
 * Qualquer falha (modo privativo, quota estourada, JSON corrompido) resolve
 * para `null` em vez de estourar — o site não pode quebrar por causa de storage.
 */
const memoryFallback = new Map<string, string>();

/**
 * Safari em modo privativo e browsers com cookies de terceiros bloqueados
 * chegam a lançar no simples acesso a `localStorage`. Detectamos uma vez e
 * caímos para um Map em memória (a sessão funciona, só não sobrevive a reload).
 */
const backend = ((): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> => {
  try {
    const probe = '__rolesc_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    console.warn('[storage] localStorage indisponível; usando memória volátil.');
    return {
      getItem: (k) => memoryFallback.get(k) ?? null,
      setItem: (k, v) => void memoryFallback.set(k, v),
      removeItem: (k) => void memoryFallback.delete(k),
    };
  }
})();

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = backend.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storage.get] falha ao ler chave ${key}`, err);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      backend.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[storage.set] falha ao salvar chave ${key}`, err);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      backend.removeItem(key);
    } catch (err) {
      console.warn(`[storage.remove] falha ao remover chave ${key}`, err);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await storage.remove(key);
    }
  },
};
