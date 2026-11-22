import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import { useGame } from '../game/useGame';
import { renderWorkspace } from '../optimizer/workspace/testing';

import { buildSkeleton } from './skeleton';

vi.mock('../game/useGame', () => ({ useGame: vi.fn() }));

/**
 * `validateTemplate` corre busquedas de verdad para sus auto-tests. Cuatro
 * pruebas llamandolo en paralelo con el resto de la suite agotaban el tiempo
 * de espera de una prueba del optimizador que no tiene nada que ver.
 *
 * Aparte, lo que esta pantalla debe demostrar es que PINTA un informe, no que
 * sabe calcularlo: eso es del motor y ya tiene sus 142 pruebas. Con el doble,
 * estas pruebas son deterministas y baratas.
 */
vi.mock('@zenith/core-engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@zenith/core-engine')>()),
  validateTemplate: vi.fn(() => ({
    ok: true,
    issues: [],
    selfTests: [],
    summary: { stats: 1, slots: 1, sets: 0, objectives: 1, monotonicOk: 1, profiles: 1 },
  })),
}));

const vacia = buildSkeleton({ name: 'Juego vacio' }, 'juego-vacio');

/** Lo minimo que el motor acepta para poder buscar de verdad. */
const completa: GameTemplate = {
  ...vacia,
  name: 'Juego completo',
  stats: [{ id: 'atk', name: 'Attack', unit: 'flat' }],
  slots: [{ id: 'arma', name: 'Weapon' }],
  objectives: [
    { id: 'dps', name: 'Damage', description: 'More damage.', kind: 'linear', formula: 'atk' },
  ],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 10 } }],
  constrainableStats: ['atk'],
};

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const open = () => renderWorkspace('/optimizer/x/configuracion');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConfigurationPage', () => {
  it('dice que partes faltan cuando el juego no puede optimizar', async () => {
    mockGame(vacia);
    open();

    expect(await screen.findByText(/cannot run yet/i)).toBeTruthy();

    // Las cuatro obligatorias, por su nombre, dentro del aviso.
    for (const label of ['Stats', 'Slots', 'Objectives', 'Characters']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('no marca como faltantes las partes opcionales', async () => {
    mockGame(vacia);
    open();

    const aviso = await screen.findByText(/cannot run yet/i);
    const lista = aviso.parentElement?.textContent ?? '';
    expect(lista).not.toContain('Set bonuses');
    expect(lista).not.toContain('Derived values');
  });

  it('con lo minimo declarado dice que puede correr', async () => {
    mockGame(completa);
    open();

    expect(await screen.findByText(/it can run/i)).toBeTruthy();
    expect(screen.queryByText(/cannot run yet/i)).toBeNull();
  });

  it('lista los elementos de cada parte con su id tecnico', async () => {
    mockGame(completa);
    open();

    await screen.findByText(/it can run/i);
    // "Attack" sale dos veces: en Stats y otra vez en las restringibles, que
    // resuelven el id a su nombre. Las dos son correctas.
    expect(screen.getAllByText('Attack').length).toBe(2);
    expect(screen.getAllByText('atk').length).toBeGreaterThan(0);
    expect(screen.getByText('Weapon')).toBeTruthy();
  });

  it('muestra el informe del motor y lo vuelve a correr a peticion', async () => {
    mockGame(completa);
    open();

    const boton = await screen.findByRole('button', { name: 'Check again' });
    await waitFor(() => expect(screen.getByText('Engine report')).toBeTruthy());

    fireEvent.click(boton);
    await waitFor(() => expect(screen.getByText('Engine report')).toBeTruthy());
  });
});
