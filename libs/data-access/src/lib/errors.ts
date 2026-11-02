/** Error propio de la capa de datos: el mensaje se puede mostrar al usuario. */
export class DataAccessError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'DataAccessError';
  }
}

const isQuotaError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'QuotaExceededError' ||
    error.name === 'InvalidStateError' ||
    /quota|space|espacio/i.test(error.message));

/**
 * Normaliza cualquier fallo de la base en un `DataAccessError` con mensaje en
 * espanol. La demo se tragaba estos errores: aca se propagan.
 */
export function toDataError(error: unknown, context: string): DataAccessError {
  if (error instanceof DataAccessError) return error;
  if (isQuotaError(error)) {
    return new DataAccessError(`No hay espacio en este navegador para ${context}.`, { cause: error });
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new DataAccessError(`No se pudo ${context}: ${detail}`, { cause: error });
}
