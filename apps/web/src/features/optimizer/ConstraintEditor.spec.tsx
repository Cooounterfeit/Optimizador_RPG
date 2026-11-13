import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { ConstraintEditor } from './ConstraintEditor';

const template = {
  stats: [{ id: 'atk', name: 'ATK', unit: 'flat' }],
  constrainableStats: ['atk'],
} as unknown as GameTemplate;

function Harness() {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  return <ConstraintEditor template={template} constraints={constraints} onChange={setConstraints} />;
}

describe('ConstraintEditor', () => {
  it('agrega, cambia a máximo y quita una restricción', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Add constraint' }));

    const kind = screen.getByLabelText('Rule');
    const value = screen.getByLabelText('Value');
    fireEvent.change(kind, { target: { value: 'max' } });
    fireEvent.change(value, { target: { value: '30' } });

    expect((kind as HTMLSelectElement).value).toBe('max');
    expect((value as HTMLInputElement).value).toBe('30');

    fireEvent.click(screen.getByRole('button', { name: 'Remove constraint' }));
    expect(screen.queryByLabelText('Rule')).toBeNull();
  });
});
