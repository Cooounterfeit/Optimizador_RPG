import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { CatalogOptimizer } from '../types';
import { OptimizerCard } from './OptimizerCard';

const optimizer: CatalogOptimizer = {
  id: 'neon-drift',
  name: 'Overdrive anomaly solver',
  gameName: 'Neon Drift',
  description: '',
  author: { id: 'kalibr', displayName: 'kalibr' },
  score: 312,
  votesCount: 68,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  category: 'Action RPG',
  published: true,
};

const renderCard = (props: Partial<CatalogOptimizer> = {}, rank?: number) =>
  render(
    <MemoryRouter>
      <OptimizerCard optimizer={{ ...optimizer, ...props }} rank={rank} />
    </MemoryRouter>,
  );

describe('OptimizerCard', () => {
  it('dibuja juego, titulo, creador y puntaje', () => {
    renderCard();

    expect(screen.getByText('Neon Drift')).toBeTruthy();
    expect(screen.getByText('Overdrive anomaly solver')).toBeTruthy();
    expect(screen.getByText('@kalibr')).toBeTruthy();
    expect(screen.getByText(/312/)).toBeTruthy();
    expect(screen.getByText('3d')).toBeTruthy();
  });

  it('sin portada usa el degradado con iniciales', () => {
    const { container } = renderCard();

    expect(screen.getByText('ND')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('con portada dibuja la imagen', () => {
    const { container } = renderCard({ cover: 'data:image/png;base64,abc' });

    expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,abc');
    expect(screen.queryByText('ND')).toBeNull();
  });

  it('muestra el puesto cuando entra en el top', () => {
    renderCard({}, 1);

    expect(screen.getByText(/Top 1/)).toBeTruthy();
  });

  it('la tarjeta enlaza al optimizador', () => {
    renderCard();

    expect(screen.getByRole('link', { name: /Open Overdrive anomaly solver/ })).toBeTruthy();
  });
});
