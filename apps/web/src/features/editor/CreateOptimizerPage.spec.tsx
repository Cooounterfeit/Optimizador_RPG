import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '@zenith/data-access';

import { getGameRepository, setGameRepository } from '../game/repositories';

import { CreateOptimizerPage } from './CreateOptimizerPage';

const real = getGameRepository();

/** Repositorio en memoria: lo que importa es que se guarde y con que id. */
const fakeRepo = (existentes: string[] = []) => {
  const guardados: { id: string; template: unknown }[] = [];
  const repo = {
    list: async () => existentes.map((id) => ({ id, template: {}, updatedAt: 0 })),
    get: async () => undefined,
    save: async (game: { id: string; template: unknown }) => {
      guardados.push(game);
      return game;
    },
    remove: async () => undefined,
  } as unknown as GameRepository;
  return { repo, guardados };
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/crear']}>
      <Routes>
        <Route path="/crear" element={<CreateOptimizerPage />} />
        <Route path="/optimizer/:id" element={<p>workspace</p>} />
      </Routes>
    </MemoryRouter>,
  );

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

afterEach(() => {
  setGameRepository(real);
  vi.restoreAllMocks();
});

describe('CreateOptimizerPage', () => {
  it('no guarda nada si falta el nombre', async () => {
    const { repo, guardados } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(guardados).toHaveLength(0);
  });

  it('guarda el juego con un id derivado del nombre y abre su workspace', async () => {
    const { repo, guardados } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Dragón Oscuro');
    escribir('Genre', 'Souls');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].id).toBe('dragon-oscuro');
    expect(await screen.findByText('workspace')).toBeTruthy();
  });

  it('numera el id cuando ya existe uno igual', async () => {
    const { repo, guardados } = fakeRepo(['dragon-oscuro']);
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Dragón Oscuro');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    await waitFor(() => expect(guardados).toHaveLength(1));
    expect(guardados[0].id).toBe('dragon-oscuro-2');
  });

  it('muestra el fallo y deja reintentar si el guardado revienta', async () => {
    const { repo } = fakeRepo();
    setGameRepository({
      ...repo,
      save: async () => {
        throw new Error('disco lleno');
      },
    } as unknown as GameRepository);
    renderPage();

    escribir('Game name', 'Algo');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create optimizer' }).hasAttribute('disabled')).toBe(
      false,
    );
  });
});
