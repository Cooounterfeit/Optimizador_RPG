import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BuildResult, GameTemplate } from '@zenith/shared-types';

import { BuildComparison } from './BuildComparison';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
} as unknown as GameTemplate;

const objective = { id: 'damage', name: 'Damage' } as GameTemplate['objectives'][number];

const build = (itemIds: string[], atk: number, hp: number, score: number): BuildResult =>
  ({
    itemIds,
    score,
    finalStats: { atk, hp },
    activeSets: [],
  }) as unknown as BuildResult;

describe('BuildComparison', () => {
  it('compara dos builds y muestra la diferencia con signo', () => {
    render(
      <BuildComparison
        template={template}
        objective={objective}
        builds={[build(['a1', 'a2', 'a3'], 100, 50, 100), build(['b1', 'b2', 'b3'], 120, 40, 130)]}
      />,
    );

    expect(screen.getByText('Compare builds')).toBeTruthy();
    expect(screen.getByLabelText('Build A')).toBeTruthy();
    expect(screen.getByText('+30')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
    expect(screen.getByText('−10')).toBeTruthy();
  });

  it('avisa cuando las dos builds son iguales', () => {
    const same = build(['a1', 'a2', 'a3'], 100, 50, 100);
    render(
      <BuildComparison
        template={template}
        objective={objective}
        builds={[same, { ...same, score: 100 }]}
      />,
    );

    expect(screen.getByText('These builds are identical.')).toBeTruthy();
  });

  it('avisa cuando solo hay una build', () => {
    render(
      <BuildComparison
        template={template}
        objective={objective}
        builds={[build(['a1'], 100, 50, 100)]}
      />,
    );

    expect(screen.getByText(/Only one build was found/)).toBeTruthy();
  });
});
