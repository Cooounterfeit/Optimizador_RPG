import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SolveStats } from '@zenith/shared-types';

import { SearchSummary } from './SearchSummary';

const stats = (patch: Partial<SolveStats>): SolveStats =>
  ({
    evaluated: 7251,
    totalCombinations: 2418904,
    elapsedMs: 1800,
    provenOptimal: false,
    ...patch,
  }) as SolveStats;

describe('SearchSummary', () => {
  it('dice que el optimo esta demostrado', () => {
    render(<SearchSummary stats={stats({ provenOptimal: true })} />);

    expect(screen.getByText('Optimal')).toBeTruthy();
  });

  it('distingue una parada manual de un limite de tiempo', () => {
    const { unmount } = render(<SearchSummary stats={stats({ stoppedBy: 'usuario' })} />);
    expect(screen.getByText('Stopped')).toBeTruthy();
    unmount();

    render(<SearchSummary stats={stats({ stoppedBy: 'tiempo' })} />);
    expect(screen.getByText('Time limit')).toBeTruthy();
  });

  it('muestra las cuentas de la busqueda', () => {
    render(<SearchSummary stats={stats({})} />);

    expect(screen.getByText('2,418,904')).toBeTruthy();
    expect(screen.getByText('99.7%')).toBeTruthy();
    expect(screen.getByText('7,251')).toBeTruthy();
    expect(screen.getByText('1.8 s')).toBeTruthy();
  });
});
