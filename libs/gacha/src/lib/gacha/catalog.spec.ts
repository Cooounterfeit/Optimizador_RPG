import type { GameTemplate } from '@zenith/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearGachaCatalogCache, gachaPointer, loadGachaCatalog } from './catalog';
import type { GachaCatalog } from './types';

const catalog: GachaCatalog = {
  kind: 'gacha',
  weaponSlot: 'weapon',
  weapons: [
    {
      key: 'starlight-blade',
      name: 'Starlight Blade',
      rarity: 5,
      type: 'sword',
      maxLevel: 90,
      atk: 400,
    },
  ],
  curves: { '1': { growth: 1 } },
};

const pointer = {
  kind: 'gacha' as const,
  catalogUrl: 'https://example.test/catalog-1.json',
  catalogVersion: '1',
};

const template = (extensions?: Record<string, unknown>): GameTemplate =>
  ({
    schemaVersion: '0.1',
    gameId: 'demo',
    name: 'Demo',
    description: '',
    stats: [],
    slots: [],
    sets: [],
    derived: [],
    objectives: [],
    baseProfiles: [{ id: 'p', name: 'P', base: {} }],
    constrainableStats: [],
    extensions,
  }) as GameTemplate;

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 })) as Promise<Response>;

beforeEach(() => clearGachaCatalogCache());

describe('gachaPointer', () => {
  it('lee el puntero de extensions.gacha', () => {
    expect(gachaPointer(template({ gacha: pointer }))).toEqual(pointer);
  });

  it('devuelve null sin extension o con datos invalidos', () => {
    expect(gachaPointer(template())).toBeNull();
    expect(gachaPointer(template({ gacha: { kind: 'gacha' } }))).toBeNull();
    expect(gachaPointer(template({ gacha: { kind: 'otro', catalogUrl: '/x' } }))).toBeNull();
  });
});

describe('loadGachaCatalog', () => {
  it('descarga y valida el catalogo', async () => {
    const fetcher = vi.fn(() => ok(catalog));
    const result = await loadGachaCatalog(pointer, fetcher as unknown as typeof fetch);

    expect(result.weapons[0].key).toBe('starlight-blade');
    expect(fetcher).toHaveBeenCalledWith(pointer.catalogUrl);
  });

  it('cachea por URL', async () => {
    const fetcher = vi.fn(() => ok(catalog));

    await loadGachaCatalog(pointer, fetcher as unknown as typeof fetch);
    await loadGachaCatalog(pointer, fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('olvida la cache si la descarga falla', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('', { status: 404 })));

    await expect(loadGachaCatalog(pointer, fetcher as unknown as typeof fetch)).rejects.toThrow(
      /not available \(404\)/,
    );

    fetcher.mockImplementationOnce(() => ok(catalog));
    await expect(
      loadGachaCatalog(pointer, fetcher as unknown as typeof fetch),
    ).resolves.toMatchObject({ kind: 'gacha' });
  });

  it('rechaza un catalogo con forma invalida', async () => {
    const fetcher = vi.fn(() => ok({ kind: 'gacha', weapons: 'nope' }));

    await expect(loadGachaCatalog(pointer, fetcher as unknown as typeof fetch)).rejects.toThrow(
      /not valid/,
    );
  });
});
