import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { OptimizerCardRow } from '../../lib/database.types';

import { defaultCatalogRepository, mockCatalogRepository } from './catalog-repository';
import { createSupabaseCatalogRepository, mapCard } from './supabase-catalog-repository';

const row = (overrides: Partial<OptimizerCardRow> = {}): OptimizerCardRow => ({
  id: 'opt-1',
  name: 'Disorder anomaly solver',
  description: 'Maximiza anomalia',
  game_name: 'Zenless Zone Zero',
  category: 'Action RPG',
  cover: 'https://cdn.ejemplo.cl/zzz.webp',
  score: 42,
  votes_count: 7,
  created_at: '2026-10-20T00:00:00.000Z',
  author_id: 'author-1',
  author_name: 'kalibr',
  author_avatar: 'https://cdn.ejemplo.cl/a.webp',
  ...overrides,
});

const client = (result: { data: unknown; error: { message: string } | null }) =>
  ({
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => ({ limit: async () => result }),
        }),
      }),
    }),
  }) as unknown as SupabaseClient;

describe('mapCard', () => {
  it('traduce la fila de la vista al modelo de la tarjeta', () => {
    expect(mapCard(row())).toEqual({
      id: 'opt-1',
      name: 'Disorder anomaly solver',
      description: 'Maximiza anomalia',
      gameName: 'Zenless Zone Zero',
      author: {
        id: 'author-1',
        displayName: 'kalibr',
        avatarUrl: 'https://cdn.ejemplo.cl/a.webp',
      },
      score: 42,
      votesCount: 7,
      createdAt: '2026-10-20T00:00:00.000Z',
      category: 'Action RPG',
      cover: 'https://cdn.ejemplo.cl/zzz.webp',
      published: true,
    });
  });

  it('deja sin categoria ni portada cuando vienen nulas', () => {
    const card = mapCard(row({ category: null, cover: null, author_avatar: null }));
    expect(card.category).toBeUndefined();
    expect(card.cover).toBeUndefined();
    expect(card.author.avatarUrl).toBeUndefined();
  });
});

describe('createSupabaseCatalogRepository', () => {
  it('devuelve las tarjetas mapeadas', async () => {
    const repository = createSupabaseCatalogRepository(client({ data: [row()], error: null }));
    const list = await repository.list();

    expect(list).toHaveLength(1);
    expect(list[0].gameName).toBe('Zenless Zone Zero');
  });

  it('propaga el error de Supabase', async () => {
    const repository = createSupabaseCatalogRepository(
      client({ data: null, error: { message: 'permission denied' } }),
    );

    await expect(repository.list()).rejects.toThrow('permission denied');
  });
});

describe('fabrica del catalogo', () => {
  it('sin variables de entorno usa los fixtures', () => {
    expect(defaultCatalogRepository).toBe(mockCatalogRepository);
  });
});
