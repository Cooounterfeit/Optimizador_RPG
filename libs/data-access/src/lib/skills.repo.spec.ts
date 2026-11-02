import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, type ZenithDatabase } from './db.js';
import { DataAccessError } from './errors.js';
import type { SkillsRepository } from './ports.js';
import { createSkillsRepository } from './skills.repo.js';

describe('skills repository', () => {
  let database: ZenithDatabase;
  let name: string;
  let repo: SkillsRepository;

  beforeEach(() => {
    name = `test-skills-${crypto.randomUUID()}`;
    database = createDb(name);
    repo = createSkillsRepository(database);
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('devuelve una seleccion vacia si el juego no tiene habilidades', async () => {
    await expect(repo.load('g1')).resolves.toEqual({});
  });

  it('guarda y lee la seleccion', async () => {
    await repo.save('g1', { golpeBrutal: 2, furia: 1 });

    await expect(repo.load('g1')).resolves.toEqual({ golpeBrutal: 2, furia: 1 });
  });

  it('guarda un mapa vacio borrando la fila', async () => {
    await repo.save('g1', { golpeBrutal: 2 });
    await repo.save('g1', {});

    await expect(database.skills.count()).resolves.toBe(0);
    await expect(repo.load('g1')).resolves.toEqual({});
  });

  it('rechaza rangos negativos o decimales', async () => {
    await expect(repo.save('g1', { golpeBrutal: -1 })).rejects.toBeInstanceOf(DataAccessError);
    await expect(repo.save('g1', { golpeBrutal: 1.5 })).rejects.toBeInstanceOf(DataAccessError);
  });

  it('separa la seleccion por juego', async () => {
    await repo.save('g1', { a: 1 });
    await repo.save('g2', { b: 2 });

    await expect(repo.load('g1')).resolves.toEqual({ a: 1 });
    await expect(repo.load('g2')).resolves.toEqual({ b: 2 });
  });
});
