import { describe, expect, it, vi } from 'vitest';

import { isUuid, resolveGame, type GameSource } from './sources';

const fuente = (
  id: string,
  responde: boolean,
  resultado: { template: unknown; sampleItems: []; published: boolean } | undefined,
): GameSource => ({
  id,
  canHandle: () => responde,
  load: vi.fn(async () => resultado),
});

const algo = { template: { gameId: 'x' }, sampleItems: [] as [], published: false };

describe('isUuid', () => {
  it('reconoce un uuid', () => {
    expect(isUuid('0b57d1f6-0b2c-4f0e-9a1e-2b3c4d5e6f70')).toBe(true);
  });

  it('rechaza un id con forma de slug, que es lo que crea el editor', () => {
    expect(isUuid('mi-juego')).toBe(false);
  });
});

describe('resolveGame', () => {
  it('devuelve lo del primer origen que responda', async () => {
    const primero = fuente('primero', true, algo);
    const segundo = fuente('segundo', true, algo);

    await expect(resolveGame('x', [primero, segundo])).resolves.toBe(algo);
    expect(segundo.load).not.toHaveBeenCalled();
  });

  it('salta el origen que no sabe resolver ese id', async () => {
    const ajeno = fuente('ajeno', false, algo);
    const propio = fuente('propio', true, algo);

    await expect(resolveGame('x', [ajeno, propio])).resolves.toBe(algo);
    expect(ajeno.load).not.toHaveBeenCalled();
  });

  it('sigue buscando cuando un origen responde pero no tiene nada', async () => {
    const vacio = fuente('vacio', true, undefined);
    const lleno = fuente('lleno', true, algo);

    await expect(resolveGame('x', [vacio, lleno])).resolves.toBe(algo);
    expect(vacio.load).toHaveBeenCalled();
  });

  it('devuelve undefined si ninguno lo tiene, sin lanzar', async () => {
    await expect(resolveGame('x', [fuente('a', true, undefined)])).resolves.toBeUndefined();
  });
});
