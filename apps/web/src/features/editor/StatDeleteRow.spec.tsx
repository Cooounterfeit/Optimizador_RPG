import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import {
  getGameRepository,
  setGameRepository,
  setInventoryRepository,
} from '../game/repositories';
import { fakeGameRepository, fakeInventoryRepository } from '../game/testing';
import { useGame } from '../game/useGame';
import { renderWorkspace } from '../optimizer/workspace/testing';

import { buildSkeleton } from './skeleton';

vi.mock('../game/useGame', () => ({ useGame: vi.fn() }));

vi.mock('@zenith/core-engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@zenith/core-engine')>()),
  validateTemplate: vi.fn(() => ({
    ok: true,
    issues: [],
    selfTests: [],
    summary: { stats: 0, slots: 0, sets: 0, objectives: 0, monotonicOk: 0, profiles: 0 },
  })),
}));

const real = getGameRepository();

/**
 * `atk` la usa el objetivo y un conjunto; `libre` no la usa nadie. Hay dos
 * objetivos para que borrar uno no deje la plantilla sin ninguno, que es otro
 * aviso distinto.
 */
const plantilla: GameTemplate = {
  ...buildSkeleton({ name: 'Mi juego' }, 'x'),
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'libre', name: 'Libre', unit: 'flat' },
    { id: 'def', name: 'Defensa', unit: 'flat' },
  ],
  slots: [{ id: 'arma', name: 'Arma' }],
  sets: [
    { id: 's1', name: 'Conjunto', tiers: [{ pieces: 2, label: '2pz', effects: { atk: 10 } }] },
  ],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk * 2' },
    { id: 'tank', name: 'Aguante', description: '', kind: 'linear', formula: 'def' },
  ],
  baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10 } }],
};

let juegos = fakeGameRepository();
const guardadas = () => juegos.saved.map((entry) => entry.template);

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const abrir = () => renderWorkspace('/optimizer/x/configuracion');
const stats = () => screen.getByRole('region', { name: 'Stats' });

/**
 * El panel de confirmacion. Hace falta acotar: los nombres que lista tambien
 * aparecen en los bloques de objetivos y conjuntos de la misma pagina.
 */
const panel = () => {
  const titulo = within(stats()).getByText(/^Delete .+\?$/);
  const caja = titulo.closest('div');
  if (!caja) throw new Error('el panel de confirmacion no tiene contenedor');
  return caja;
};

const borrar = async (nombre: string) => {
  await screen.findByRole('region', { name: 'Stats' });
  fireEvent.click(within(stats()).getByRole('button', { name: `Delete ${nombre}` }));
};

beforeEach(() => {
  vi.clearAllMocks();
  juegos = fakeGameRepository();
  setGameRepository(juegos.repo);
  setInventoryRepository(fakeInventoryRepository());
  mockGame(plantilla);
});

afterEach(() => {
  setGameRepository(real);
});

describe('caso 1: no esta en uso', () => {
  it('se borra directo, sin preguntar', async () => {
    abrir();
    await borrar('Libre');

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    expect(guardadas()[0].stats.map((s) => s.id)).toEqual(['atk', 'def']);
  });

  it('lo dice al terminar', async () => {
    abrir();
    await borrar('Libre');

    expect(await screen.findByText('Attribute deleted.')).toBeTruthy();
  });

  it('no enseña ninguna confirmacion', async () => {
    abrir();
    await borrar('Libre');

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Delete all of it' })).toBeNull();
  });
});

describe('caso 2: esta en uso', () => {
  it('no borra nada hasta que se confirma', async () => {
    abrir();
    await borrar('Ataque');

    expect(await screen.findByRole('button', { name: 'Delete all of it' })).toBeTruthy();
    expect(guardadas()).toHaveLength(0);
  });

  it('lista lo que se va entero, con su tipo', async () => {
    abrir();
    await borrar('Ataque');

    await screen.findByText('Removed completely');
    // El objetivo que la usaba en su formula.
    expect(within(panel()).getByText('Dano')).toBeTruthy();
    expect(within(panel()).getByText('objective')).toBeTruthy();
  });

  it('separa lo que solo pierde este valor', async () => {
    abrir();
    await borrar('Ataque');

    expect(await screen.findByText('Kept, without this value')).toBeTruthy();
    // El conjunto y el personaje se quedan.
    expect(within(panel()).getByText('Conjunto')).toBeTruthy();
  });

  it('al confirmar borra la estadistica y lo que dependia', async () => {
    abrir();
    await borrar('Ataque');

    fireEvent.click(await screen.findByRole('button', { name: 'Delete all of it' }));

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    const t = guardadas()[0];
    expect(t.stats.map((s) => s.id)).toEqual(['libre', 'def']);
    // El objetivo que la usaba se fue; el otro se queda.
    expect(t.objectives.map((o) => o.id)).toEqual(['tank']);
    // El conjunto se queda, sin el efecto.
    expect(t.sets[0].tiers[0].effects).toEqual({});
    expect(await screen.findByText(/everything that depended on it deleted/i)).toBeTruthy();
  });

  it('cancelar no borra nada', async () => {
    abrir();
    await borrar('Ataque');

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Delete all of it' })).toBeNull(),
    );
    expect(guardadas()).toHaveLength(0);
  });
});

describe('cuando el borrado deja el optimizador sin poder buscar', () => {
  it('lo avisa antes, en vez de dejar que se rompa de lado', async () => {
    // Un solo objetivo, y usa `atk`: al borrarla no queda ninguno.
    mockGame({
      ...plantilla,
      objectives: [
        { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk * 2' },
      ],
    });
    abrir();
    await borrar('Ataque');

    const aviso = await screen.findByText(/will not be able to run/i);
    expect(aviso.textContent).toContain('Objectives');
  });

  it('pero no avisa si ya estaba sin poder buscar antes', async () => {
    // Sin personajes desde el principio: eso ya faltaba, no lo causa el borrado.
    mockGame({ ...plantilla, baseProfiles: [] });
    abrir();
    await borrar('Ataque');

    await screen.findByRole('button', { name: 'Delete all of it' });
    expect(screen.queryByText(/Characters would be left empty/i)).toBeNull();
  });
});

describe('permisos', () => {
  it('un optimizador del catalogo no ofrece borrar', async () => {
    mockGame({ ...plantilla, gameId: 'otro' });
    abrir();

    await screen.findByRole('region', { name: 'Stats' });
    expect(within(stats()).queryByRole('button', { name: /^Delete/ })).toBeNull();
  });
});
