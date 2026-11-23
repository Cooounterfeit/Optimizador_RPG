import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

/**
 * El informe por defecto. Se vuelve a poner en cada prueba porque
 * `clearAllMocks` limpia las llamadas pero NO la implementacion: sin esto, la
 * prueba que simula errores del motor se los deja puestos a las siguientes.
 */
const informeLimpio = {
  ok: true,
  issues: [],
  selfTests: [],
  summary: { stats: 0, slots: 0, sets: 0, objectives: 0, monotonicOk: 0, profiles: 0 },
} as ReturnType<typeof validateTemplate>;

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


beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateTemplate).mockReturnValue(informeLimpio);
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

/** El boton flotante, que esta siempre y siempre se puede pulsar. */
const botonGuardar = (nombre = 'Save to my account') =>
  screen.findByRole('button', { name: nombre });

describe('el boton esta siempre', () => {
  it('aparece en un optimizador recien creado, aunque no se pueda guardar', async () => {
    mockGame(incompleta);
    abrir(conSesion);

    const boton = await botonGuardar();
    expect((boton as HTMLButtonElement).disabled).toBe(false);
  });

  it('aparece sin sesion', async () => {
    abrir();

    expect(await botonGuardar()).toBeTruthy();
  });

  it('aparece sin cuentas configuradas', async () => {
    abrir({ auth: null });

    expect(await botonGuardar()).toBeTruthy();
  });

  it('un optimizador del catalogo no lo lleva', async () => {
    mockGame({ ...plantilla, gameId: 'otro' });
    abrir(conSesion);

    await screen.findByText('Mi juego');
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
  });
});

describe('sin sesion', () => {
  it('al pulsarlo sale el aviso de que hace falta una cuenta', async () => {
    abrir();
    fireEvent.click(await botonGuardar());

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/you must sign in/i)).toBeTruthy();
  });

  it('ofrece iniciar sesion y tambien crear una cuenta', async () => {
    abrir();
    fireEvent.click(await botonGuardar());

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(within(dialogo).getByRole('button', { name: 'Create an account' })).toBeTruthy();
  });

  it('no manda nada a la nube', async () => {
    abrir();
    fireEvent.click(await botonGuardar());
    await screen.findByRole('dialog');

    expect(enviados).toEqual([]);
  });
});

describe('sin cuentas configuradas', () => {
  it('lo dice en el dialogo en vez de callarse', async () => {
    abrir({ auth: null });
    fireEvent.click(await botonGuardar());

    expect(await screen.findByText(/no accounts set up/i)).toBeTruthy();
  });
});

describe('la plantilla tiene que estar completa', () => {
  it('un optimizador recien creado no se guarda, y dice que falta', async () => {
    mockGame(incompleta);
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/Still missing:/i).textContent).toContain('Slots');
    expect(enviados).toEqual([]);
  });

  it('con errores del motor tampoco', async () => {
    vi.mocked(validateTemplate).mockReturnValue({
      ...informeLimpio,
      ok: false,
      issues: [{ severity: 'error', code: 'E_ALGO', message: 'Algo esta mal' }],
    } as ReturnType<typeof validateTemplate>);
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    expect(await screen.findByText(/errors to fix first/i)).toBeTruthy();
    expect(enviados).toEqual([]);
  });
});

describe('con sesion y la plantilla lista', () => {
  it('pregunta quien lo puede ver antes de guardar', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    expect(await screen.findByRole('radio', { name: /Only me/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /The community/ })).toBeTruthy();
    expect(enviados).toEqual([]);
  });

  it('dice que los objetos del jugador no viajan', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    const nota = await screen.findByText(/Your items stay in this browser/i);
    expect(nota.textContent).toMatch(/import them by JSON or add them by hand/i);
  });

  it('privado es lo que sale elegido', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    const privado = await screen.findByRole('radio', { name: /Only me/ });
    expect((privado as HTMLInputElement).checked).toBe(true);
  });

  it('guardar privado deja el optimizador fuera del catalogo', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(enviados).toHaveLength(1));
    expect(enviados[0].draft.shared).toBe(false);
  });

  it('compartir con la comunidad sube `shared`', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());
    fireEvent.click(await screen.findByRole('radio', { name: /The community/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(enviados).toHaveLength(1));
    expect(enviados[0].draft.shared).toBe(true);
  });

  it('despues de guardar el boton pasa a decir que son cambios', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await botonGuardar('Save changes')).toBeTruthy();
  });

  it('el segundo guardado actualiza la misma fila y recuerda lo elegido', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());
    fireEvent.click(await screen.findByRole('radio', { name: /The community/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.click(await botonGuardar('Save changes'));
    // Lo elegido la vez anterior sale ya marcado.
    const comunidad = await screen.findByRole('radio', { name: /The community/ });
    expect((comunidad as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(enviados).toHaveLength(2));
    expect(enviados[1].id).toBe('uuid-nuevo');
  });
});

describe('el dialogo se comporta como un dialogo', () => {
  it('Escape lo cierra', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('se anuncia con su titulo', async () => {
    abrir(conSesion);
    fireEvent.click(await botonGuardar());

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(dialogo.getAttribute('aria-labelledby')).toBeTruthy();
  });
});
