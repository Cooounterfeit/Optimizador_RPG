import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

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

    const max = screen.getByRole('radio', { name: 'Maximum' }) as HTMLInputElement;
    fireEvent.click(max);
    expect(max.checked).toBe(true);

    const value = screen.getByLabelText('Value') as HTMLInputElement;
    fireEvent.change(value, { target: { value: '30' } });
    expect(value.value).toBe('30');

    fireEvent.click(screen.getByRole('button', { name: 'Remove constraint' }));
    expect(screen.queryByRole('radiogroup', { name: 'Rule' })).toBeNull();
  });

  it('mueve el valor al cambiar de dirección', () => {
    const onChange = vi.fn();
    render(
      <ConstraintEditor
        template={template}
        constraints={[{ statId: 'atk', min: 40 }]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Maximum' }));

    expect(onChange).toHaveBeenCalledWith([{ statId: 'atk', min: undefined, max: 40 }]);
  });
});
