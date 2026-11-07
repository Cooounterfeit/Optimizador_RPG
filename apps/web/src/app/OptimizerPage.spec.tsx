import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { GameRepository } from '@zenith/data-access';

import { mockCatalogRepository, setCatalogRepository } from '../features/catalog/catalog-repository';
import { setGameRepository } from '../features/game/repositories';
import { defaultOptimizerRepository, setOptimizerRepository } from '../features/optimizer/optimizer-repository';
import { OptimizerPage } from './OptimizerPage';

const noopGames: GameRepository = {
  list: async () => [],
  get: async () => undefined,
  save: async (game) => ({ ...game, updatedAt: 0 }),
  remove: async () => undefined,
  clearLocalData: async () => undefined,
};

const renderPage = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/optimizer/${id}`]}>
      <Routes>
        <Route path="optimizer/:id" element={<OptimizerPage />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  setCatalogRepository(mockCatalogRepository);
  setOptimizerRepository(defaultOptimizerRepository);
  setGameRepository(noopGames);
});

describe('OptimizerPage', () => {
  it('muestra la ficha de una tarjeta demo sin plantilla en vez de un error', async () => {
    setCatalogRepository(mockCatalogRepository);
    setOptimizerRepository(defaultOptimizerRepository);
    setGameRepository(noopGames);

    renderPage('zzz-disorder');

    expect(await screen.findByText('Disorder anomaly solver')).toBeTruthy();
    expect(screen.getByText('Demo optimizer')).toBeTruthy();
    expect(screen.queryByText('Could not load this optimizer')).toBeNull();
  });

  it('da error cuando el id no existe ni en el catalogo', async () => {
    setCatalogRepository(mockCatalogRepository);
    setOptimizerRepository(defaultOptimizerRepository);
    setGameRepository(noopGames);

    renderPage('no-existe');

    expect(await screen.findByText('Could not load this optimizer')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
