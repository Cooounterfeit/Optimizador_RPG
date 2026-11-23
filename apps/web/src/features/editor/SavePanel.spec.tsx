import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateTemplate } from '@zenith/core-engine';
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

/**
 * Completa a proposito. Desde que guardar exige que la validacion este limpia,
 * el esqueleto vacio no sirve para probar el guardado: quedaria bloqueado por
 * los cuatro bloques obligatorios y no se llegaria nunca al panel.
 */
const plantilla: GameTemplate = {
  ...buildSkeleton({ name: 'Mi juego' }, 'x'),
  stats: [{ id: 'atk', name: 'Ataque', unit: 'flat' }],
  slots: [{ id: 'arma', name: 'Arma' }],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk' },
  ],
  baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10 } }],
};

/** Lo que el esqueleto recien creado es de verdad: incompleto. */
const incompleta: GameTemplate = buildSkeleton({ name: 'Recien creado' }, 'x');

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

/**
 * El boton nace apagado y se enciende cuando el informe del motor llega, que es
 * lo que ve el usuario. Hacer clic antes no abre nada, y es correcto: la
 * plantilla todavia no esta revisada.
 */
const guardarListo = async () => {
  const boton = await screen.findByRole('button', { name: 'Save to my account' });
  await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
  return boton;
};

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
  it('el boton sigue ahi, apagado, y dice por que', async () => {
    // Antes desaparecia. Un boton ausente no explica nada: quien lo busca
    // concluye que no se guardo nada.
    abrir({ auth: null });

    const boton = await screen.findByRole('button', { name: 'Save to my account' });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/no accounts set up/i)).toBeTruthy();
  });
});

describe('con sesion', () => {
  it('ofrece guardar en la cuenta', async () => {
    abrir(conSesion);

    expect(await screen.findByRole('button', { name: 'Save to my account' })).toBeTruthy();
  });

  it('antes de guardar pregunta quien lo puede ver', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());

    expect(await screen.findByRole('radio', { name: /Only me/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /The community/ })).toBeTruthy();
    // No se guarda hasta confirmar.
    expect(enviados).toEqual([]);
  });

  it('dice que los objetos del jugador no viajan', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());

    const nota = await screen.findByText(/Your items stay in this browser/i);
    expect(nota.textContent).toMatch(/import them by JSON or add them by hand/i);
  });

  it('privado es lo que sale elegido, no comunitario', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());

    const privado = await screen.findByRole('radio', { name: /Only me/ });
    expect((privado as HTMLInputElement).checked).toBe(true);
  });

  it('guardar privado lo dice y deja el optimizador fuera del catalogo', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/visible only to you/i)).toBeTruthy();
    expect(enviados[0].draft.shared).toBe(false);
  });

  it('compartir con la comunidad sube `shared` y lo dice', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());
    fireEvent.click(await screen.findByRole('radio', { name: /The community/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/shared with the community/i)).toBeTruthy();
    expect(enviados[0].draft.shared).toBe(true);
  });

  it('una vez guardado, el boton repite lo elegido sin volver a preguntar', async () => {
    abrir(conSesion);
    fireEvent.click(await guardarListo());
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
    fireEvent.click(await guardarListo());
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

describe('la plantilla tiene que estar completa', () => {
  const informeLimpio = {
    ok: true,
    issues: [],
    selfTests: [],
    summary: { stats: 0, slots: 0, sets: 0, objectives: 0, monotonicOk: 0, profiles: 0 },
  };

  it('un optimizador recien creado muestra el boton, apagado', async () => {
    // El esqueleto no tiene ranuras, objetivos ni personajes. El boton aparece
    // igual: esconderlo haria creer que el guardado no existe.
    mockGame(incompleta);
    abrir(conSesion);

    const boton = await screen.findByRole('button', { name: 'Save to my account' });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(true));
  });

  it('y dice exactamente que falta', async () => {
    mockGame(incompleta);
    abrir(conSesion);

    const nota = await screen.findByText(/Still missing:/i);
    expect(nota.textContent).toContain('Slots');
    expect(nota.textContent).toContain('Objectives');
    expect(nota.textContent).toContain('Characters');
  });

  it('con errores del motor tampoco se guarda', async () => {
    vi.mocked(validateTemplate).mockReturnValue({
      ...informeLimpio,
      ok: false,
      issues: [
        { severity: 'error', code: 'E_ALGO', message: 'Algo esta mal', where: 'stats' },
      ],
    } as ReturnType<typeof validateTemplate>);
    abrir(conSesion);

    const boton = await screen.findByRole('button', { name: 'Save to my account' });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByText(/errors to fix first/i)).toBeTruthy();
  });

  it('sin sesion el boton sigue llevando a iniciarla, y ademas dice que falta', async () => {
    // Las dos cosas se dicen: iniciar sesion es el primer paso, pero completar
    // la plantilla tambien hace falta y mas vale saberlo antes de volver.
    mockGame(incompleta);
    abrir();

    expect(await screen.findByRole('button', { name: 'Sign in to save' })).toBeTruthy();
    expect(screen.getByText(/Still missing:/i)).toBeTruthy();
  });
});
