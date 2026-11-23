import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { buildSkeleton } from '../editor/skeleton';

import {
  createSupabaseOptimizerRepository,
  defaultOptimizerRepository,
  resolveGameId,
  toOptimizerWrite,
} from './optimizer-repository';

/**
 * Lo que importa aqui no es que la consulta se escriba bien, que eso lo dice
 * el tipo, sino QUE se manda. Lo que sube a la nube es la plantilla y nada
 * mas: si un dia alguien agrega el inventario al envio "para que la copia
 * funcione", estas pruebas se caen, y es exactamente lo que deben hacer.
 */

const plantilla: GameTemplate = {
  ...buildSkeleton({ name: 'Mi juego', description: 'Lo que hace' }, 'mi-juego'),
};

interface Capturado {
  insert?: Record<string, unknown>;
  update?: Record<string, unknown>;
  id?: string;
  /** Las llamadas a `ensure_game`, que es quien resuelve el juego. */
  juegosPedidos: string[];
}

const nuevoCapturado = (): Capturado => ({ juegosPedidos: [] });

/**
 * Cliente de mentira. El juego ya no se busca ni se inserta desde aqui: lo
 * resuelve Postgres con `ensure_game`, asi que lo unico que hay que comprobar
 * es que se le pide y con que nombre.
 */
const clienteFalso = (capturado: Capturado, falla = false) =>
  ({
    rpc: async (fn: string, args: { p_name: string }) => {
      if (fn !== 'ensure_game') throw new Error(`funcion inesperada: ${fn}`);
      capturado.juegosPedidos.push(args.p_name);
      return falla
        ? { data: null, error: { message: 'hace falta una sesion para registrar un juego' } }
        : { data: 'g-resuelto', error: null };
    },
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        capturado.insert = payload;
        return {
          select: () => ({
            single: async () => ({ data: { id: 'uuid-nuevo' }, error: null }),
          }),
        };
      },
      update: (payload: Record<string, unknown>) => {
        capturado.update = payload;
        return {
          eq: (_columna: string, id: string) => {
            capturado.id = id;
            return Promise.resolve({ error: null });
          },
        };
      },
    }),
  }) as unknown as SupabaseClient;

describe('plantilla a columnas', () => {
  it('no manda los objetos del jugador', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: true }, 'g1').sample_items).toEqual(
      [],
    );
  });

  it('el juego viaja como referencia, no como texto', () => {
    const write = toOptimizerWrite({ template: plantilla, shared: false }, 'g1');

    expect(write.game_id).toBe('g1');
    expect(write).not.toHaveProperty('game_name');
  });

  it('compartir con la comunidad es `published`', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: true }, 'g1').published).toBe(true);
    expect(toOptimizerWrite({ template: plantilla, shared: false }, 'g1').published).toBe(
      false,
    );
  });

  it('la descripcion viaja', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: false }, 'g1').description).toBe(
      'Lo que hace',
    );
  });

  it('solo lleva `forked_from` si viene de algo', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: false }, 'g1')).not.toHaveProperty(
      'forked_from',
    );
    expect(
      toOptimizerWrite({ template: plantilla, shared: false, forkedFrom: 'uuid-origen' }, 'g1'),
    ).toMatchObject({ forked_from: 'uuid-origen' });
  });
});

describe('a que juego pertenece', () => {
  it('lo resuelve Postgres, no el navegador', async () => {
    // `game_insert` exige ser administrador, asi que crear el juego desde aqui
    // fallaria para casi todo el mundo. Lo hace `ensure_game`.
    const capturado = nuevoCapturado();

    await expect(resolveGameId(clienteFalso(capturado), 'Hollow Vigil')).resolves.toBe(
      'g-resuelto',
    );
    expect(capturado.juegosPedidos).toEqual(['Hollow Vigil']);
  });

  it('si la funcion falla, no se inventa un juego', async () => {
    const capturado = nuevoCapturado();

    await expect(resolveGameId(clienteFalso(capturado, true), 'Hollow Vigil')).rejects.toThrow(
      /sesion/i,
    );
  });
});

describe('guardar en la cuenta', () => {
  it('insertar devuelve el id de la fila nueva', async () => {
    const capturado = nuevoCapturado();
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));

    await expect(repo.createOptimizer({ template: plantilla, shared: false })).resolves.toBe(
      'uuid-nuevo',
    );
    expect(capturado.insert).toMatchObject({ name: 'Mi juego', published: false });
    expect(capturado.insert?.game_id).toBe('g-resuelto');
  });

  it('actualizar no reescribe de donde salio ni a que juego pertenece', async () => {
    const capturado = nuevoCapturado();
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));

    await repo.updateOptimizer('uuid-mio', {
      template: plantilla,
      shared: true,
      forkedFrom: 'uuid-origen',
    });

    expect(capturado.id).toBe('uuid-mio');
    expect(capturado.update).not.toHaveProperty('forked_from');
    // Renombrar tu optimizador no deberia moverlo de juego.
    expect(capturado.update).not.toHaveProperty('game_id');
    expect(capturado.update).toMatchObject({ published: true });
  });

  it('actualizar no toca el catalogo de juegos', async () => {
    const capturado = nuevoCapturado();
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));

    await repo.updateOptimizer('uuid-mio', { template: plantilla, shared: false });

    expect(capturado.juegosPedidos).toEqual([]);
  });

  it('el inventario no tiene por donde entrar en el envio', async () => {
    const capturado = nuevoCapturado();
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));
    const pieza: Item = { id: 'a', slot: 'arma', setId: null, name: 'Pieza', stats: {} };

    // No hay campo para pasarlo: esto no compila si alguien le abre la puerta.
    // @ts-expect-error el borrador no acepta objetos
    await repo.createOptimizer({ template: plantilla, shared: false, sampleItems: [pieza] });

    expect(capturado.insert?.sample_items).toEqual([]);
  });
});

describe('sin cuentas configuradas', () => {
  it('no finge que guardo', async () => {
    await expect(
      defaultOptimizerRepository.createOptimizer({ template: plantilla, shared: false }),
    ).rejects.toThrow(/no hay donde guardar/i);
  });
});
