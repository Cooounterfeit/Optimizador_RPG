import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository, InventoryRepository } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { getGameRepository, setGameRepository, setInventoryRepository } from '../game/repositories';
import { useGame } from '../game/useGame';
import { renderWorkspace } from '../optimizer/workspace/testing';

import { buildSkeleton } from './skeleton';

vi.mock('../game/useGame', () => ({ useGame: vi.fn() }));

/** Igual que en `ConfigurationPage.spec`: el informe no es lo que se prueba aqui. */
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

/** `editable` exige que el id de la URL sea el de la plantilla, y la URL es /x. */
const vacia = buildSkeleton({ name: 'Mi juego' }, 'x');

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const guardados: GameTemplate[] = [];

const fakeRepos = () => {
  setGameRepository({
    list: async () => [],
    get: async () => undefined,
    save: async (game: { id: string; template: GameTemplate }) => {
      guardados.push(game.template);
      return game;
    },
    remove: async () => undefined,
  } as unknown as GameRepository);
  setInventoryRepository({
    addItem: async () => undefined,
    getAll: async () => [],
    getById: async () => undefined,
    updateItem: async () => undefined,
    removeItem: async () => undefined,
    searchItems: async () => [],
    removeByGame: async () => undefined,
  } as unknown as InventoryRepository);
};

const abrir = () => renderWorkspace('/optimizer/x/configuracion');
const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Create attribute' }));

const nuevoAtributo = async (nombre: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add attribute' }));
  escribir('Name', nombre);
};

beforeEach(() => {
  vi.clearAllMocks();
  guardados.length = 0;
  fakeRepos();
  mockGame(vacia);
});

afterEach(() => {
  setGameRepository(real);
});

describe('StatsEditor', () => {
  it('se llega al formulario desde la vista de configuracion', async () => {
    abrir();
    expect(await screen.findByRole('button', { name: 'Add attribute' })).toBeTruthy();
  });

  it('crea el atributo y aparece en el listado sin recargar', async () => {
    abrir();
    await nuevoAtributo('Fuerza');
    enviar();

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].stats).toHaveLength(1);
    expect(guardados[0].stats[0]).toMatchObject({ id: 'fuerza', name: 'Fuerza', unit: 'flat' });

    // Y la pantalla ya lo muestra, sin volver a cargar la plantilla.
    expect(await screen.findByText('fuerza')).toBeTruthy();
    expect(screen.getByText('Attribute created.')).toBeTruthy();
  });

  it('exige el nombre', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Add attribute' }));
    enviar();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Give the attribute a name');
    expect(guardados).toHaveLength(0);
  });

  it('corta a los 100 caracteres, que es el limite del criterio', async () => {
    abrir();
    await nuevoAtributo('a'.repeat(101));
    enviar();

    expect((await screen.findByRole('alert')).textContent).toContain('longer than 100');
    expect(guardados).toHaveLength(0);
  });

  it('no deja dos atributos con el mismo nombre, sin mirar mayusculas', async () => {
    mockGame({ ...vacia, stats: [{ id: 'fuerza', name: 'Fuerza', unit: 'flat' }] });
    abrir();
    await nuevoAtributo('  fuerza  ');
    enviar();

    expect((await screen.findByRole('alert')).textContent).toContain('already an attribute');
    expect(guardados).toHaveLength(0);
  });

  it('deriva un id que sirve como variable, nunca con guion', async () => {
    abrir();
    await nuevoAtributo('Ataque critico');
    enviar();

    await waitFor(() => expect(guardados).toHaveLength(1));
    const { id } = guardados[0].stats[0];
    expect(id).toBe('ataqueCritico');
    expect(id).not.toContain('-');
  });

  it('marca las porcentuales con el guion bajo final de la convencion', async () => {
    abrir();
    await nuevoAtributo('Ataque');
    fireEvent.click(screen.getByLabelText('Percent'));
    enviar();

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].stats[0]).toMatchObject({ id: 'ataque_', unit: 'percent' });
  });

  it('guarda la acumulacion solo cuando no es la habitual', async () => {
    abrir();
    await nuevoAtributo('Dano mas');
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByLabelText('Multiplies'));
    enviar();

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].stats[0].aggregate).toBe('multiply');
  });

  it('no ofrece editar un optimizador del catalogo, porque no se podria guardar', async () => {
    // El id de la URL es "x" y el de la plantilla otro: lo guardado no se
    // volveria a leer por esa URL.
    mockGame({ ...vacia, gameId: 'otro' });
    abrir();

    expect(await screen.findByText(/cannot be edited here yet/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add attribute' })).toBeNull();
  });
});
