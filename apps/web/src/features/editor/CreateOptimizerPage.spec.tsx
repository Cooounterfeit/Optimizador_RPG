import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { getGameRepository, setGameRepository } from '../game/repositories';
import { fakeGameRepository } from '../game/testing';

import { CreateOptimizerPage } from './CreateOptimizerPage';

const real = getGameRepository();

/** Un id suelto, o un par id/nombre cuando la prueba mira el choque de nombres. */
type Existente = string | { id: string; name: string };

const fakeRepo = (existentes: Existente[] = []) =>
  fakeGameRepository(
    existentes.map((entry) =>
      typeof entry === 'string'
        ? { id: entry, template: {} as GameTemplate }
        : { id: entry.id, template: { name: entry.name } as GameTemplate },
    ),
  );

/** El destino, que ademas delata a que ruta se llego. */
function Destino() {
  const { pathname } = useLocation();
  return (
    <>
      <p>workspace</p>
      <p data-testid="ruta">{pathname}</p>
    </>
  );
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/crear']}>
      <Routes>
        <Route path="/crear" element={<CreateOptimizerPage />} />
        <Route path="/optimizer/:id/*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), {
    target: { value: valor },
  });

afterEach(() => {
  setGameRepository(real);
  vi.restoreAllMocks();
});

describe('CreateOptimizerPage', () => {
  it('no guarda nada si falta el nombre', async () => {
    const { repo, saved } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(saved).toHaveLength(0);
  });

  it('guarda el juego con un id derivado del nombre y abre su workspace', async () => {
    const { repo, saved } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Dragón Oscuro');
    escribir('Genre', 'Souls');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].id).toBe('dragon-oscuro');
    expect(await screen.findByText('workspace')).toBeTruthy();
  });

  it('numera el id cuando ya existe uno igual', async () => {
    const { repo, saved } = fakeRepo(['dragon-oscuro']);
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Dragón Oscuro');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].id).toBe('dragon-oscuro-2');
  });

  it('avisa mientras escribe de los caracteres que el criterio no permite', async () => {
    const { repo, saved } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Juego@');
    expect(
      await screen.findByText(
        /only contain letters, numbers, spaces and underscores/i,
      ),
    ).toBeTruthy();

    // Y no lo deja pasar: un aviso que se puede ignorar no sirve de nada.
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(saved).toHaveLength(0);
  });

  it('el aviso se va al corregir el nombre', async () => {
    const { repo } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Juego@');
    await screen.findByText(/only contain letters/i);

    escribir('Game name', 'Juego');
    await waitFor(() =>
      expect(screen.queryByText(/only contain letters/i)).toBeNull(),
    );
  });

  it('acepta 100 caracteres y rechaza 101, que es el limite del criterio', async () => {
    const { repo, saved } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'a'.repeat(101));
    expect(
      await screen.findByText(/cannot be longer than 100 characters/i),
    ).toBeTruthy();

    escribir('Game name', 'a'.repeat(100));
    await waitFor(() =>
      expect(screen.queryByText(/cannot be longer/i)).toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));
    await waitFor(() => expect(saved).toHaveLength(1));
  });

  it('dice que el nombre ya existe en vez de numerarlo a escondidas', async () => {
    const { repo, saved } = fakeRepo([
      { id: 'elden-ring', name: 'Elden Ring' },
    ]);
    setGameRepository(repo);
    renderPage();

    // Distinta caja: sigue siendo el mismo nombre para el autor.
    escribir('Game name', 'elden ring');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain(
      'already have an optimizer',
    );
    expect(saved).toHaveLength(0);
  });

  it('lleva a la seccion de configuracion, que es lo que falta por hacer', async () => {
    const { repo } = fakeRepo();
    setGameRepository(repo);
    renderPage();

    escribir('Game name', 'Hollow Knight');
    fireEvent.click(screen.getByRole('button', { name: 'Create optimizer' }));

    await screen.findByText('workspace');
    expect(screen.getByTestId('ruta').textContent).toBe(
      '/optimizer/hollow-knight/configuracion',
    );
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
    expect(
      screen
        .getByRole('button', { name: 'Create optimizer' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
});
