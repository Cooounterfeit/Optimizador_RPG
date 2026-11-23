import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { buildSkeleton } from '../editor/skeleton';

import {
  createSupabaseOptimizerRepository,
  defaultOptimizerRepository,
  gameSlug,
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
  juegosCreados: Record<string, unknown>[];
  buscados: string[];
}

const nuevoCapturado = (): Capturado => ({ juegosCreados: [], buscados: [] });

/**
 * Cliente de mentira con las dos tablas que toca el guardado. `game` arranca
 * con los juegos que se le den y acepta altas, para poder probar los dos
 * caminos: el que lo encuentra y el que lo crea.
 */
const clienteFalso = (
  capturado: Capturado,
  juegos: { id: string; slug: string; name: string }[] = [],
  slugsTomados: string[] = [],
) =>
  ({
    from: (tabla: string) => {
      if (tabla === 'game') {
        return {
          select: () => ({
            ilike: (_columna: string, valor: string) => {
              capturado.buscados.push(valor);
              const encontrado = juegos.find(
                (juego) => juego.name.trim().toLowerCase() === valor.trim().toLowerCase(),
              );
              return {
                maybeSingle: async () => ({
                  data: encontrado ? { id: encontrado.id } : null,
                  error: null,
                }),
              };
            },
          }),
          insert: (fila: { slug: string; name: string }) => {
            capturado.juegosCreados.push(fila);
            const chocado =
              slugsTomados.includes(fila.slug) ||
              juegos.some((juego) => juego.slug === fila.slug);
            return {
              select: () => ({
                single: async () =>
                  chocado
                    ? { data: null, error: { message: 'duplicate key value' } }
                    : (juegos.push({ id: `g-${fila.slug}`, ...fila }),
                      { data: { id: `g-${fila.slug}` }, error: null }),
              }),
            };
          },
        };
      }

      return {
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
      };
    },
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

describe('el slug del catalogo', () => {
  it('quita acentos y separa con guiones', () => {
    expect(gameSlug('Camión Fantástico')).toBe('camion-fantastico');
  });

  it('un nombre sin letras ni numeros no deja el slug vacio', () => {
    // La tabla exige que el slug cumpla un patron: vacio no pasa el check.
    expect(gameSlug('!!!')).toBe('juego');
  });
});

describe('a que juego pertenece', () => {
  it('reutiliza el que ya existe, sin mirar mayusculas', () => {
    const capturado = nuevoCapturado();
    const client = clienteFalso(capturado, [
      { id: 'g-existente', slug: 'mi-juego', name: 'MI JUEGO' },
    ]);

    return expect(resolveGameId(client, 'Mi juego')).resolves.toBe('g-existente');
  });

  it('lo crea cuando no esta', async () => {
    const capturado = nuevoCapturado();
    const client = clienteFalso(capturado);

    await expect(resolveGameId(client, 'Hollow Vigil')).resolves.toBe('g-hollow-vigil');
    expect(capturado.juegosCreados[0]).toMatchObject({
      slug: 'hollow-vigil',
      name: 'Hollow Vigil',
    });
  });

  it('recorta el nombre a lo que la tabla admite', async () => {
    const capturado = nuevoCapturado();
    const largo = 'a'.repeat(100);
    await resolveGameId(clienteFalso(capturado), largo);

    expect((capturado.juegosCreados[0] as { name: string }).name).toHaveLength(80);
  });

  it('si el slug esta tomado por otro juego, prueba con sufijo', async () => {
    const capturado = nuevoCapturado();
    const client = clienteFalso(capturado, [], ['hollow-vigil']);

    await expect(resolveGameId(client, 'Hollow Vigil')).resolves.toBe('g-hollow-vigil-2');
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
    expect(capturado.insert?.game_id).toBe('g-mi-juego');
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

    expect(capturado.juegosCreados).toEqual([]);
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
