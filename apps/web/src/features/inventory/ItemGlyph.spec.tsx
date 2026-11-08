import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ItemGlyph } from './ItemGlyph';

describe('ItemGlyph', () => {
  it('muestra el icono cuando hay URL', () => {
    const { container } = render(<ItemGlyph name="Sword" src="https://example.test/icon.png" />);
    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('https://example.test/icon.png');
  });

  it('cae a las iniciales cuando no hay URL', () => {
    const { container } = render(<ItemGlyph name="Sword" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('S');
  });

  it('cae a las iniciales si la imagen falla', () => {
    const { container } = render(<ItemGlyph name="Sword" src="https://example.test/roto.png" />);
    const image = container.querySelector('img');
    expect(image).not.toBeNull();

    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('S');
  });
});
