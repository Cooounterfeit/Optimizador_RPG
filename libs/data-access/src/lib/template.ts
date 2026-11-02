import type { GameTemplate } from '@zenith/shared-types';

/**
 * Juego completamente vacio: sin estadisticas, sin ranuras, sin objetivos y sin
 * objetos. Punto de partida del editor de formularios.
 *
 * Se incluye un perfil base porque todo juego necesita al menos uno.
 */
export function emptyTemplate(id: string, name = 'Mi juego'): GameTemplate {
  return {
    schemaVersion: '0.1',
    gameId: id,
    name,
    description: '',
    stats: [],
    slots: [],
    sets: [],
    derived: [],
    objectives: [],
    baseProfiles: [{ id: 'base', name: 'Personaje base', base: {} }],
    constrainableStats: [],
  };
}
