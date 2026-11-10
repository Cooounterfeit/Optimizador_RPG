import type { GameTemplate } from '@zenith/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearInventoryCatalogCache, loadInventoryCatalog } from './catalog';
import { InventoryRulesSchema, inventoryPointer, type InventoryPointer } from './rules';

const catalog = {
  kind: 'inventory',
  entries: [
    {
      key: 'star-blade',
      name: 'Star Blade',
      rarity: 5,
      type: 'blade',
      maxLevel: 10,
      stats: { power: { value: 40 } },
    },
  ],
  curves: { '1': { growth: 1 } },
};

const pointer: InventoryPointer = {
  kind: 'inventory',
  catalogUrl: 'https://example.test/catalog-1.json',
  catalogVersion: '1',
  rules: InventoryRulesSchema.parse({
    rarities: [1, 2, 3, 4, 5],
    artifactLevelRange: { min: 0, max: 20 },
    itemLevelRange: { min: 0, max: 99 },
  }),
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

beforeEach(() => clearInventoryCatalogCache());

describe('inventoryPointer', () => {
  it('lee el puntero de extensions.inventory', () => {
    expect(inventoryPointer(template({ inventory: pointer }))).toEqual(pointer);
  });

  it('devuelve null sin extension o con datos invalidos', () => {
    expect(inventoryPointer(template())).toBeNull();
    expect(inventoryPointer(template({ inventory: { kind: 'inventory' } }))).toBeNull();
    expect(
      inventoryPointer(template({ inventory: { kind: 'otro', catalogUrl: '/x' } })),
    ).toBeNull();
  });
});

describe('loadInventoryCatalog', () => {
  it('descarga y valida el catalogo', async () => {
    const fetcher = vi.fn(() => ok(catalog));
    const result = await loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch);

    expect(result.entries[0].key).toBe('star-blade');
    expect(fetcher).toHaveBeenCalledWith(pointer.catalogUrl);
  });

  it('cachea por URL', async () => {
    const fetcher = vi.fn(() => ok(catalog));

    await loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch);
    await loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('olvida la cache si la descarga falla', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('', { status: 404 })));

    await expect(
      loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch),
    ).rejects.toThrow(/not available \(404\)/);

    fetcher.mockImplementationOnce(() => ok(catalog));
    await expect(
      loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch),
    ).resolves.toMatchObject({ kind: 'inventory' });
  });

  it('rechaza un catalogo con forma invalida', async () => {
    const fetcher = vi.fn(() => ok({ kind: 'inventory', entries: 'nope' }));

    await expect(
      loadInventoryCatalog(pointer, fetcher as unknown as typeof fetch),
    ).rejects.toThrow(/not valid/);
  });
});
