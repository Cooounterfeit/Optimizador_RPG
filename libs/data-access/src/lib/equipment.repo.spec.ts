import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import { createEquipmentRepository } from './equipment.repo.js';
import type { EquipmentRepository } from './ports.js';

describe('equipment repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: EquipmentRepository;

  beforeEach(() => {
    name = `test-equipment-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createEquipmentRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('devuelve un equipo vacio si el personaje nunca se equipo', async () => {
    await expect(repo.get('g1', 'guerrero')).resolves.toEqual({});
  });

  it('guarda y lee el equipo de cada personaje', async () => {
    await repo.save('g1', 'guerrero', { weapon: 'espada', chest: '' });
    await repo.save('g1', 'mago', { weapon: 'baston' });

    await expect(repo.get('g1', 'guerrero')).resolves.toEqual({ weapon: 'espada', chest: '' });
    await expect(repo.get('g1', 'mago')).resolves.toEqual({ weapon: 'baston' });
  });

  it('no comparte equipo entre personajes del mismo juego', async () => {
    await repo.save('g1', 'guerrero', { weapon: 'espada' });

    await expect(repo.get('g1', 'mago')).resolves.toEqual({});
  });

  it('no comparte equipo entre juegos', async () => {
    await repo.save('g1', 'guerrero', { weapon: 'espada' });

    await expect(repo.get('g2', 'guerrero')).resolves.toEqual({});
  });

  it('borra el equipo de un personaje sin tocar al otro', async () => {
    await repo.save('g1', 'guerrero', { weapon: 'espada' });
    await repo.save('g1', 'mago', { weapon: 'baston' });

    await repo.removeProfile('g1', 'guerrero');

    await expect(repo.get('g1', 'guerrero')).resolves.toEqual({});
    await expect(repo.get('g1', 'mago')).resolves.toEqual({ weapon: 'baston' });
  });

  it('borra todo el equipo de un juego', async () => {
    await repo.save('g1', 'guerrero', { weapon: 'espada' });
    await repo.save('g1', 'mago', { weapon: 'baston' });
    await repo.save('g2', 'guerrero', { weapon: 'hacha' });

    await repo.removeByGame('g1');

    await expect(database.equipment.count()).resolves.toBe(1);
    await expect(repo.get('g2', 'guerrero')).resolves.toEqual({ weapon: 'hacha' });
  });

  it('rechaza un equipo con valores que no son ids', async () => {
    await expect(
      repo.save('g1', 'guerrero', { weapon: 3 } as unknown as Record<string, string>),
    ).rejects.toBeInstanceOf(DataAccessError);
  });
});
