import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ItemGlyph } from './ItemGlyph';

describe('ItemGlyph', () => {
  it('muestra el icono cuando hay una fuente', () => {
    const { container } = render(
      <ItemGlyph name="Sword" sources={['https://example.test/icon.png']} />,
    );
    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('https://example.test/icon.png');
  });

  it('cae a las iniciales cuando no hay fuentes', () => {
    const { container } = render(<ItemGlyph name="Sword" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('S');
  });

  it('prueba la siguiente fuente si la imagen falla', () => {
    const { container } = render(
      <ItemGlyph
        name="Sword"
        sources={['https://example.test/roto.png', 'https://example.test/icon.png']}
      />,
    );

    const first = container.querySelector('img');
    expect(first?.getAttribute('src')).toBe('https://example.test/roto.png');

    fireEvent.error(first as HTMLImageElement);

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/icon.png',
    );
  });

  it('cae a las iniciales cuando fallan todas las fuentes', () => {
    const { container } = render(
      <ItemGlyph name="Sword" sources={['https://example.test/roto.png']} />,
    );

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('S');
  });
});
