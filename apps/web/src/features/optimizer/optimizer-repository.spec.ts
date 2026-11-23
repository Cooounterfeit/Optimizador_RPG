import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { buildSkeleton } from '../editor/skeleton';

import {
  createSupabaseOptimizerRepository,
  defaultOptimizerRepository,
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
}

const clienteFalso = (capturado: Capturado) =>
  ({
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
    const write = toOptimizerWrite({ template: plantilla, shared: true });

    expect(write.sample_items).toEqual([]);
  });

  it('el nombre del optimizador y el del juego salen del mismo nombre', () => {
    const write = toOptimizerWrite({ template: plantilla, shared: false });

    expect(write.name).toBe('Mi juego');
    expect(write.game_name).toBe('Mi juego');
  });

  it('compartir con la comunidad es `published`', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: true }).published).toBe(true);
    expect(toOptimizerWrite({ template: plantilla, shared: false }).published).toBe(false);
  });

  it('la descripcion viaja', () => {
    // La columna es `not null`, y el esqueleto ya garantiza una cadena: el
    // esquema la exige, asi que no hace falta defenderse de undefined aqui.
    expect(toOptimizerWrite({ template: plantilla, shared: false }).description).toBe(
      'Lo que hace',
    );
  });

  it('solo lleva `forked_from` si viene de algo', () => {
    expect(toOptimizerWrite({ template: plantilla, shared: false })).not.toHaveProperty(
      'forked_from',
    );
    expect(
      toOptimizerWrite({ template: plantilla, shared: false, forkedFrom: 'uuid-origen' }),
    ).toMatchObject({ forked_from: 'uuid-origen' });
  });
});

describe('guardar en la cuenta', () => {
  it('insertar devuelve el id de la fila nueva', async () => {
    const capturado: Capturado = {};
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));

    await expect(repo.createOptimizer({ template: plantilla, shared: false })).resolves.toBe(
      'uuid-nuevo',
    );
    expect(capturado.insert).toMatchObject({ name: 'Mi juego', published: false });
  });

  it('actualizar no reescribe de donde salio', async () => {
    const capturado: Capturado = {};
    const repo = createSupabaseOptimizerRepository(clienteFalso(capturado));

    await repo.updateOptimizer('uuid-mio', {
      template: plantilla,
      shared: true,
      forkedFrom: 'uuid-origen',
    });

    expect(capturado.id).toBe('uuid-mio');
    expect(capturado.update).not.toHaveProperty('forked_from');
    expect(capturado.update).toMatchObject({ published: true });
  });

  it('el inventario no tiene por donde entrar en el envio', async () => {
    const capturado: Capturado = {};
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
