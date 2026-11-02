export type Unsubscribe = () => void;

export interface Emitter<T> {
  subscribe(listener: (value: T) => void): Unsubscribe;
  emit(value: T): void;
}

/**
 * Avisos de cambio simples. La logica de los repos no depende de `liveQuery`:
 * las vistas se suscriben y se refrescan cuando hay una escritura.
 */
export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value) {
      for (const listener of listeners) {
        try {
          listener(value);
        } catch {
          // Un suscriptor roto no puede romper la escritura que ya ocurrio.
        }
      }
    },
  };
}
