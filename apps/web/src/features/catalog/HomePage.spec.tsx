import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { mockCatalogRepository, setCatalogRepository } from './catalog-repository';
import { HomePage } from './HomePage';

const renderHome = (entry = '/') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <HomePage />
    </MemoryRouter>,
  );

const cards = () => screen.queryAllByRole('article');

afterEach(() => {
  setCatalogRepository(mockCatalogRepository);
});

describe('HomePage', () => {
  it('muestra el estado de carga antes de tener datos', () => {
    setCatalogRepository({ list: () => new Promise(() => undefined) });
    renderHome();

    expect(screen.getByText('Loading optimizers…')).toBeTruthy();
    expect(screen.queryByText('No optimizers match that')).toBeNull();
  });

  it('muestra las tarjetas del catalogo', async () => {
    renderHome();

    expect(await screen.findByText('Disorder anomaly solver')).toBeTruthy();
    expect(cards()).toHaveLength(12);
  });

  it('filtra por genero y actualiza el contador', async () => {
    renderHome();
    await screen.findByText('Disorder anomaly solver');

    fireEvent.click(screen.getByRole('button', { name: /Action RPG/ }));

    await waitFor(() => expect(cards()).toHaveLength(4));
    expect(screen.getByText('Shiyu defense budget')).toBeTruthy();
  });

  it('ordena por los mejor valorados', async () => {
    renderHome();
    await screen.findByText('Disorder anomaly solver');

    const titles = cards().map((card) => card.querySelector('h3')?.textContent);
    expect(titles[0]).toBe('Disorder anomaly solver');
    expect(titles[1]).toBe('Shiyu defense budget');
  });

  it('distingue un catalogo vacio de una busqueda sin resultados', async () => {
    setCatalogRepository({ list: async () => [] });
    renderHome();

    expect(await screen.findByText('No optimizers yet')).toBeTruthy();
    expect(screen.getByText('Create the first optimizer')).toBeTruthy();
    expect(screen.queryByText('No optimizers match that')).toBeNull();
  });

  it('muestra el estado vacio cuando nada coincide', async () => {
    renderHome('/?q=no-existe');

    expect(await screen.findByText('No optimizers match that')).toBeTruthy();
    expect(cards()).toHaveLength(0);
  });

  it('limpia los filtros desde el estado vacio', async () => {
    renderHome('/?q=no-existe');
    await screen.findByText('No optimizers match that');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(cards()).toHaveLength(12));
  });

  it('el rail de novedades queda en trabajo en curso', async () => {
    renderHome();

    expect(await screen.findByText('Work in progress')).toBeTruthy();
  });
});
