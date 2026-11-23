import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import { SAMPLE_USER } from '../auth/test-auth';
import {
  getGameRepository,
  setGameRepository,
  setInventoryRepository,
} from '../game/repositories';
import {
  fakeGameRepository,
  fakeInventoryRepository,
  fakeOptimizerRepository,
} from '../game/testing';
import { useGame } from '../game/useGame';
import {
  getOptimizerRepository,
  setOptimizerRepository,
  type OptimizerDraft,
} from '../optimizer/optimizer-repository';
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

const realGames = getGameRepository();
const realOptimizers = getOptimizerRepository();

const plantilla: GameTemplate = buildSkeleton({ name: 'Mi juego' }, 'x');

let juegos = fakeGameRepository();
let enviados: { id?: string; draft: OptimizerDraft }[] = [];

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const abrir = (options?: Parameters<typeof renderWorkspace>[1]) =>
  renderWorkspace('/optimizer/x/configuracion', options);

const conSesion = { user: SAMPLE_USER };

beforeEach(() => {
  vi.clearAllMocks();
  juegos = fakeGameRepository();
  setGameRepository(juegos.repo);
  setInventoryRepository(fakeInventoryRepository());
  enviados = [];
  setOptimizerRepository(
    fakeOptimizerRepository({
      createOptimizer: async (draft) => {
        enviados.push({ draft });
        return 'uuid-nuevo';
      },
      updateOptimizer: async (id, draft) => {
        enviados.push({ id, draft });
      },
    }),
  );
  mockGame(plantilla);
});

afterEach(() => {
  setGameRepository(realGames);
  setOptimizerRepository(realOptimizers);
});

describe('sin sesion', () => {
  it('el boton invita a iniciar sesion en vez de fallar al guardar', async () => {
    abrir();

    expect(await screen.findByRole('button', { name: 'Sign in to save' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save to my account' })).toBeNull();
  });

  it('dice por que hace falta la cuenta', async () => {
    abrir();

    expect(await screen.findByText(/only you and the admins can change or delete it/i)).toBeTruthy();
  });
});

describe('sin cuentas configuradas', () => {
  it('no ofrece guardar y lo explica', async () => {
    abrir({ auth: null });

    expect(await screen.findByText(/no accounts set up/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });
});

describe('con sesion', () => {
  it('ofrece guardar en la cuenta', async () => {
    abrir(conSesion);

    expect(await screen.findByRole('button', { name: 'Save to my account' })).toBeTruthy();
  });

  it('antes de guardar pregunta quien lo puede ver', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));

    expect(await screen.findByRole('radio', { name: /Only me/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /The community/ })).toBeTruthy();
    // No se guarda hasta confirmar.
    expect(enviados).toEqual([]);
  });

  it('dice que los objetos del jugador no viajan', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));

    const nota = await screen.findByText(/Your items stay in this browser/i);
    expect(nota.textContent).toMatch(/import them by JSON or add them by hand/i);
  });

  it('privado es lo que sale elegido, no comunitario', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));

    const privado = await screen.findByRole('radio', { name: /Only me/ });
    expect((privado as HTMLInputElement).checked).toBe(true);
  });

  it('guardar privado lo dice y deja el optimizador fuera del catalogo', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/visible only to you/i)).toBeTruthy();
    expect(enviados[0].draft.shared).toBe(false);
  });

  it('compartir con la comunidad sube `shared` y lo dice', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));
    fireEvent.click(await screen.findByRole('radio', { name: /The community/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/shared with the community/i)).toBeTruthy();
    expect(enviados[0].draft.shared).toBe(true);
  });

  it('una vez guardado, el boton repite lo elegido sin volver a preguntar', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    const otra = await screen.findByRole('button', { name: 'Save changes' });
    fireEvent.click(otra);

    // El segundo actualiza la fila que ya existe: no hay optimizadores gemelos.
    await waitFor(() => expect(enviados).toHaveLength(2));
    expect(enviados[1].id).toBe('uuid-nuevo');
    expect(screen.queryByRole('radio', { name: /Only me/ })).toBeNull();
  });

  it('y se puede cambiar quien lo ve despues', async () => {
    abrir(conSesion);
    fireEvent.click(await screen.findByRole('button', { name: 'Save to my account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }));

    expect(await screen.findByRole('radio', { name: /The community/ })).toBeTruthy();
  });
});

describe('permisos', () => {
  it('un optimizador del catalogo no ofrece guardar', async () => {
    mockGame({ ...plantilla, gameId: 'otro' });
    abrir(conSesion);

    await screen.findByText('Mi juego');
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
  });
});
