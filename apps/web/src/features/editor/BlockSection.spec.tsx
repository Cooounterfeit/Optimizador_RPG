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

/** El informe del motor no es lo que se prueba aqui, y correrlo es caro. */
vi.mock('@zenith/core-engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@zenith/core-engine')>()),
  validateTemplate: vi.fn(() => ({
    ok: true,
    issues: [],
    selfTests: [],
    summary: { stats: 3, slots: 0, sets: 0, objectives: 1, monotonicOk: 0, profiles: 0 },
  })),
}));

const real = getGameRepository();

/**
 * El orden de la plantilla (Zeta, Alfa, Beta) no coincide con el alfabetico,
 * que es justo lo que hace falta para notar cual se esta aplicando.
 *
 * Solo `alfa` aparece en una formula, asi que las otras dos salen sin usar.
 */
const plantilla: GameTemplate = {
  ...buildSkeleton({ name: 'Mi juego' }, 'x'),
  stats: [
    { id: 'zeta', name: 'Zeta', unit: 'flat' },
    { id: 'alfa', name: 'Alfa', unit: 'flat' },
    { id: 'beta', name: 'Beta', unit: 'flat' },
  ],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'alfa * 2' },
  ],
};

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const abrir = () => renderWorkspace('/optimizer/x/configuracion');

/** La seccion de estadisticas, que es una region con nombre accesible. */
const stats = () => screen.getByRole('region', { name: 'Stats' });

const nombresEnOrden = () =>
  within(stats())
    .getAllByRole('listitem')
    .map((li) => li.textContent?.match(/^(Zeta|Alfa|Beta)/)?.[1] ?? '');

beforeEach(() => {
  vi.clearAllMocks();
  setGameRepository(fakeGameRepository().repo);
  setInventoryRepository(fakeInventoryRepository());
  mockGame(plantilla);
});

afterEach(() => {
  setGameRepository(real);
});

describe('orden', () => {
  it('ordena alfabeticamente por defecto, como pide el criterio', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    expect(nombresEnOrden()).toEqual(['Alfa', 'Beta', 'Zeta']);
  });

  it('deja volver al orden de la plantilla, que es el que eligio el autor', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'template' } });

    expect(nombresEnOrden()).toEqual(['Zeta', 'Alfa', 'Beta']);
  });
});

describe('busqueda', () => {
  it('filtra por coincidencia parcial del nombre', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'et' } });

    // "Zeta" y "Beta" contienen "et"; "Alfa" no.
    await waitFor(() => expect(nombresEnOrden()).toEqual(['Beta', 'Zeta']));
    expect(screen.getByText('Showing 2 of 3.')).toBeTruthy();
  });

  it('no distingue mayusculas', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'ALFA' } });

    await waitFor(() => expect(nombresEnOrden()).toEqual(['Alfa']));
  });

  it('distingue "no hay coincidencias" de "no hay nada creado"', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'omega' } });

    expect(await screen.findByText(/No attribute matches that name/i)).toBeTruthy();
    expect(screen.queryByText(/have not created any attributes/i)).toBeNull();
  });

  it('solo las partes que lo declaran traen buscador', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    // Siete bloques, un solo buscador: el de estadisticas.
    expect(screen.getAllByLabelText('Search by name')).toHaveLength(1);
    expect(within(screen.getByRole('region', { name: 'Slots' })).queryByRole('searchbox')).toBeNull();
  });
});

describe('estado de uso', () => {
  it('dice en cuantos sitios se usa cada atributo', async () => {
    abrir();
    await screen.findByRole('region', { name: 'Stats' });

    const filas = within(stats()).getAllByRole('listitem');
    const porNombre = Object.fromEntries(
      filas.map((li) => [li.textContent?.match(/^(Zeta|Alfa|Beta)/)?.[1] ?? '', li.textContent]),
    );

    expect(porNombre['Alfa']).toContain('used in 1');
    expect(porNombre['Beta']).toContain('not used');
    expect(porNombre['Zeta']).toContain('not used');
  });

  it('cuando no hay nada creado lo dice con el texto del criterio', async () => {
    mockGame(buildSkeleton({ name: 'Vacio' }, 'x'));
    abrir();

    expect(await screen.findByText(/have not created any attributes yet/i)).toBeTruthy();
  });
});
