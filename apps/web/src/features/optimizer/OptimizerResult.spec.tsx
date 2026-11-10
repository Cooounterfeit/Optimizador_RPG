import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, SolveResponse } from '@zenith/shared-types';

import { OptimizerResult } from './OptimizerResult';

const base = {
  builds: [],
  stats: { stoppedBy: 'sin-combinacion' },
} as unknown as SolveResponse;

const template = {} as GameTemplate;
const objective = { id: 'damage', name: 'Damage' } as GameTemplate['objectives'][number];

describe('OptimizerResult', () => {
  it('explica cuando no hay combinación factible', () => {
    render(<OptimizerResult template={template} objective={objective} result={base} items={[]} />);

    expect(screen.getByText(/No combination meets the constraints/)).toBeTruthy();
  });

  it('no confunde cancelar sin build con una combinación infactible', () => {
    const stopped = {
      builds: [],
      stats: { stoppedBy: 'usuario' },
    } as unknown as SolveResponse;

    render(<OptimizerResult template={template} objective={objective} result={stopped} items={[]} />);

    expect(screen.getByText(/stopped the search before it found a build/)).toBeTruthy();
  });
});
