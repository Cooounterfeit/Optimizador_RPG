import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

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
    summary: { stats: 2, slots: 0, sets: 0, objectives: 1, monotonicOk: 0, profiles: 0 },
  })),
}));

const real = getGameRepository();

/** `atk` la usa el objetivo; `def` no la usa nadie. */
const plantilla: GameTemplate = {
  ...buildSkeleton({ name: 'Mi juego' }, 'x'),
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'def', name: 'Defensa', unit: 'flat' },
  ],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk * 2' },
  ],
};

let juegos = fakeGameRepository();
const guardadas = () => juegos.saved.map((entry) => entry.template);

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const conInventario = (items: Item[]) => setInventoryRepository(fakeInventoryRepository(items));

const abrir = () => renderWorkspace('/optimizer/x/configuracion');
const stats = () => screen.getByRole('region', { name: 'Stats' });

/** Abre la fila de ese atributo para editarla. */
const editar = async (nombre: string) => {
  await screen.findByRole('region', { name: 'Stats' });
  fireEvent.click(within(stats()).getByRole('button', { name: `Edit ${nombre}` }));
};

beforeEach(() => {
  vi.clearAllMocks();
  juegos = fakeGameRepository();
  setGameRepository(juegos.repo);
  conInventario([]);
  mockGame(plantilla);
});

afterEach(() => {
  setGameRepository(real);
});

describe('StatEditRow', () => {
  it('se llega desde el listado y llega con los datos puestos', async () => {
    abrir();
    await editar('Ataque');

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ataque');
    expect(screen.getByText(/Editing/)).toBeTruthy();
  });

  it('guarda el nombre nuevo sin tocar el id, que es lo que sostiene las formulas', async () => {
    abrir();
    await editar('Ataque');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Poder de ataque' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    const [stat] = guardadas()[0].stats;
    expect(stat).toMatchObject({ id: 'atk', name: 'Poder de ataque' });
    // La formula del objetivo sigue apuntando a `atk`, intacta.
    expect(guardadas()[0].objectives[0].formula).toBe('atk * 2');
  });

  it('no deja ponerle el nombre de otro atributo', async () => {
    abrir();
    await editar('Ataque');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'defensa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect((await screen.findByRole('alert')).textContent).toContain('already an attribute');
    expect(guardadas()).toHaveLength(0);
  });

  it('pero no se acusa a si mismo de repetido', async () => {
    abrir();
    await editar('Ataque');

    // Mismo nombre, solo cambia el grupo: no hay choque consigo mismo.
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'Ofensiva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    expect(guardadas()[0].stats[0]).toMatchObject({ name: 'Ataque', group: 'Ofensiva' });
  });

  it('exige confirmar al cambiar como acumula algo que ya se usa', async () => {
    abrir();
    await editar('Ataque');

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Multiplies'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // No guarda a la primera: avisa y cuenta cuantos sitios cambian.
    expect(await screen.findByText(/Every result will change/i)).toBeTruthy();
    expect(guardadas()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
    await waitFor(() => expect(guardadas()).toHaveLength(1));
    expect(guardadas()[0].stats[0].aggregate).toBe('multiply');
  });

  it('cuenta tambien las piezas del inventario, que son las que traen los valores', async () => {
    conInventario([
      { id: 'i1', slot: 'arma', setId: null, name: 'Espada', stats: { atk: 10 } },
      { id: 'i2', slot: 'arma', setId: null, name: 'Hacha', stats: { atk: 12 } },
    ]);
    abrir();
    await editar('Ataque');

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Multiplies'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    // El objetivo mas las dos piezas.
    expect(await screen.findByText(/3 things already use it/i)).toBeTruthy();
  });

  it('no molesta con el aviso si nadie la usa', async () => {
    abrir();
    await editar('Defensa');

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Multiplies'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(guardadas()).toHaveLength(1));
    expect(screen.queryByText(/Every result will change/i)).toBeNull();
  });

  it('cancelar no guarda nada y cierra el formulario', async () => {
    abrir();
    await editar('Ataque');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Otro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
    expect(guardadas()).toHaveLength(0);
  });

  it('un optimizador del catalogo no ofrece editar', async () => {
    mockGame({ ...plantilla, gameId: 'otro' });
    abrir();

    await screen.findByRole('region', { name: 'Stats' });
    expect(within(stats()).queryByRole('button', { name: /^Edit/ })).toBeNull();
  });
});
