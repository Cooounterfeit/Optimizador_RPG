import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, SkillSelection } from '@zenith/shared-types';

import { SkillTreePanel } from './SkillTreePanel';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'skills-demo',
  name: 'Skills Demo',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'critRate', name: 'Crit Rate', unit: 'percent' },
  ],
  slots: [],
  sets: [],
  derived: [],
  objectives: [{ id: 'score', name: 'Score', description: '', kind: 'linear', formula: 'atk' }],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 10 } }],
  constrainableStats: [],
  skillTrees: [
    {
      id: 'core',
      name: 'Core Tree',
      budget: 5,
      nodes: [
        {
          id: 'root',
          name: 'Root',
          description: 'The first node.',
          category: 'Offense',
          type: 'Passive',
          cost: 1,
          maxRank: 3,
          effects: { atk: 10 },
        },
        {
          id: 'child',
          name: 'Child',
          description: 'Needs the root.',
          category: 'Offense',
          type: 'Passive',
          cost: 1,
          maxRank: 1,
          requires: ['root'],
          effects: { critRate: 5 },
        },
        {
          id: 'ember',
          name: 'Ember',
          description: 'One choice.',
          category: 'Offense',
          type: 'Choice',
          maxRank: 1,
          requires: ['root'],
          choiceGroup: 'element',
          effects: { atk: 5 },
        },
        {
          id: 'frost',
          name: 'Frost',
          description: 'The other choice.',
          category: 'Offense',
          type: 'Choice',
          maxRank: 1,
          requires: ['root'],
          choiceGroup: 'element',
          effects: { critRate: 8 },
        },
      ],
    },
  ],
};

function Harness() {
  const [selection, setSelection] = useState<SkillSelection>({});
  return <SkillTreePanel template={template} selection={selection} onChange={setSelection} />;
}

describe('SkillTreePanel', () => {
  it('sube rangos y desbloquea nodos que dependen de otro', () => {
    render(<Harness />);

    const child = screen.getByRole('button', { name: 'Add rank to Child' });
    expect(child).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('button', { name: 'Add rank to Root' }));

    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('1 / 5 points')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add rank to Child' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('respeta los grupos de eleccion', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Add rank to Root' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add rank to Ember' }));

    const frost = screen.getByRole('button', { name: 'Add rank to Frost' });
    expect(frost).toHaveProperty('disabled', true);
    expect(frost.getAttribute('title')).toContain('eleccion');
  });

  it('muestra el catalogo y filtra habilidades', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: 'Catalog' }));
    expect(screen.getByText('Child')).toBeTruthy();
    expect(screen.getByText('Frost')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search skills'), { target: { value: 'child' } });

    expect(screen.getByText('Child')).toBeTruthy();
    expect(screen.queryByText('Frost')).toBeNull();
  });
});
