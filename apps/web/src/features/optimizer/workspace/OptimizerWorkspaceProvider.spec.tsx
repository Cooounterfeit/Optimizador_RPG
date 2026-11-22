import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { getGameRepository, setGameRepository } from '../../game/repositories';
import { useGame } from '../../game/useGame';

import { OptimizerWorkspaceProvider, useOptimizerWorkspace } from './OptimizerWorkspaceProvider';

vi.mock('../../game/useGame', () => ({ useGame: vi.fn() }));

const real = getGameRepository();

const plantilla: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'mi-juego',
  name: 'Mi juego',
  description: '',
  stats: [],
  slots: [],
  sets: [],
  derived: [],
  objectives: [],
  baseProfiles: [],
  constrainableStats: [],
};

const mockGame = (template: GameTemplate) => {
  vi.mocked(useGame).mockReturnValue({
    state: { status: 'ready', template, sampleItems: [], published: false },
    retry: vi.fn(),
  });
};

const fakeRepo = () => {
  const guardados: { id: string; template: GameTemplate }[] = [];
  const repo = {
    list: async () => [],
    get: async () => undefined,
    save: async (game: { id: string; template: GameTemplate }) => {
      guardados.push(game);
      return game;
    },
    remove: async () => undefined,
  } as unknown as GameRepository;
  return { repo, guardados };
};

/**
 * Un consumidor minimo: lo que se prueba es el contexto, no una pantalla.
 * El boton guarda un cambio y el parrafo delata lo que el contexto expone.
 */
function Sonda({ cambio }: { cambio?: Partial<GameTemplate> }) {
  const { template, editable, saveTemplate } = useOptimizerWorkspace();
  const [fallo, setFallo] = useState<string | null>(null);

  return (
    <>
      <p data-testid="nombre">{template?.name ?? 'sin plantilla'}</p>
      <p data-testid="editable">{String(editable)}</p>
      {fallo ? <p data-testid="fallo">{fallo}</p> : null}
      <button
        type="button"
        onClick={() => {
          saveTemplate({ ...plantilla, ...cambio } as GameTemplate).catch((cause: unknown) => {
            setFallo(cause instanceof Error ? cause.message : 'sin mensaje');
          });
        }}
      >
        guardar
      </button>
    </>
  );
}

const montar = (id: string, cambio?: Partial<GameTemplate>) =>
  render(
    <MemoryRouter initialEntries={[`/optimizer/${id}`]}>
      <Routes>
        <Route
          path="optimizer/:id/*"
          element={
            <OptimizerWorkspaceProvider>
              <Sonda cambio={cambio} />
            </OptimizerWorkspaceProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockGame(plantilla);
});

afterEach(() => {
  setGameRepository(real);
});

describe('editable', () => {
  it('se puede editar cuando el id de la URL es el de la plantilla', () => {
    montar('mi-juego');
    expect(screen.getByTestId('editable').textContent).toBe('true');
  });

  it('no se puede cuando el id no coincide: lo guardado no se volveria a leer', () => {
    montar('otro-id');
    expect(screen.getByTestId('editable').textContent).toBe('false');
  });

  it('no se puede con un uuid, porque el origen remoto taparia la copia local', () => {
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    mockGame({ ...plantilla, gameId: uuid });
    montar(uuid);
    expect(screen.getByTestId('editable').textContent).toBe('false');
  });
});

describe('saveTemplate', () => {
  it('guarda bajo el gameId, que es por donde lo lee el origen local', async () => {
    const { repo, guardados } = fakeRepo();
    setGameRepository(repo);
    montar('mi-juego', { name: 'Nombre nuevo' });

    fireEvent.click(screen.getByRole('button', { name: 'guardar' }));

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].id).toBe('mi-juego');
    expect(guardados[0].template.name).toBe('Nombre nuevo');
  });

  it('aplica el cambio en el acto, sin volver a cargar', async () => {
    const { repo } = fakeRepo();
    setGameRepository(repo);
    montar('mi-juego', { name: 'Nombre nuevo' });

    expect(screen.getByTestId('nombre').textContent).toBe('Mi juego');
    fireEvent.click(screen.getByRole('button', { name: 'guardar' }));

    // Sin pasar por un estado de carga: el nombre cambia y nada se desmonta.
    await waitFor(() => expect(screen.getByTestId('nombre').textContent).toBe('Nombre nuevo'));
    expect(screen.getByTestId('editable')).toBeTruthy();
  });

  it('se niega a guardar algo que no cumple el esquema', async () => {
    const { repo, guardados } = fakeRepo();
    setGameRepository(repo);
    // `stats` tiene que ser un arreglo. Si esto se guardara, el juego no se
    // podria volver a abrir: `useGame` lo rechazaria al validar.
    montar('mi-juego', { stats: 'no es un arreglo' } as unknown as Partial<GameTemplate>);

    fireEvent.click(screen.getByRole('button', { name: 'guardar' }));

    expect(await screen.findByTestId('fallo')).toBeTruthy();
    expect(guardados).toHaveLength(0);
  });
});
