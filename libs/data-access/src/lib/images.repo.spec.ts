import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import {
  ICON_SIZE,
  MAX_DATA_URL,
  createImagesRepository,
  imageKeyOf,
  imagesForItems,
  portraitKey,
  sanitizeImages,
} from './images.repo.js';
import type { ImagesRepository } from './ports.js';

const png = 'data:image/png;base64,iVBORw0KGgo=';

describe('images repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: ImagesRepository;

  beforeEach(() => {
    name = `test-images-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createImagesRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('expone el tamano de icono del diseno', () => {
    expect(ICON_SIZE).toBe(128);
  });

  it('guarda y lee imagenes por juego, con la clave normalizada', async () => {
    await repo.set('g1', 'Espada Larga', png);

    await expect(repo.get('g1')).resolves.toEqual({ 'espada larga': png });
  });

  it('rechaza datos que no son una imagen', async () => {
    await expect(repo.set('g1', 'espada', 'javascript:alert(1)')).rejects.toBeInstanceOf(
      DataAccessError,
    );
  });

  it('rechaza una imagen por encima del tope', async () => {
    const huge = `data:image/png;base64,${'A'.repeat(MAX_DATA_URL)}`;
    await expect(repo.set('g1', 'espada', huge)).rejects.toBeInstanceOf(DataAccessError);
  });

  it('importa solo lo valido y devuelve cuantas guardo', async () => {
    const count = await repo.import('g1', {
      espada: png,
      roto: 'no-es-imagen',
      enorme: `data:image/png;base64,${'A'.repeat(MAX_DATA_URL)}`,
    });

    expect(count).toBe(1);
    await expect(repo.get('g1')).resolves.toEqual({ espada: png });
  });

  it('borra una imagen puntual y todo el juego', async () => {
    await repo.set('g1', 'espada', png);
    await repo.set('g1', 'casco', png);
    await repo.set('g2', 'espada', png);

    await repo.remove('g1', 'Espada');
    await expect(repo.get('g1')).resolves.toEqual({ casco: png });

    await repo.removeByGame('g1');
    await expect(repo.get('g1')).resolves.toEqual({});
    await expect(repo.get('g2')).resolves.toEqual({ espada: png });
  });

  it('copia las imagenes de un juego a otro', async () => {
    await repo.set('g1', 'espada', png);

    await repo.copy('g1', 'g2');

    await expect(repo.get('g2')).resolves.toEqual({ espada: png });
  });

  it('normaliza claves y descarta lo que no es data URL', () => {
    expect(portraitKey('Mago Azul')).toBe('retrato mago azul');
    expect(imageKeyOf({ id: 'x', slot: 'weapon', setId: null, name: 'Espada Larga · Nv. 90', stats: {} })).toBe(
      'espada larga',
    );
    expect(sanitizeImages({ 'Espada_Larga': png, roto: 'x' })).toEqual({ 'espada larga': png });
    expect(sanitizeImages('nada')).toEqual({});
  });

  it('filtra las imagenes que no corresponden a objetos del inventario', () => {
    const all = { espada: png, casco: png };
    const items = [{ id: 'i1', slot: 'weapon', setId: null, name: 'Espada', stats: {} }];

    expect(imagesForItems(all, items)).toEqual({ espada: png });
  });
});
