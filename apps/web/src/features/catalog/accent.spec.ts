import { describe, expect, it } from 'vitest';

import { accentHue } from './accent';

describe('accentHue', () => {
  it('es estable para el mismo nombre', () => {
    expect(accentHue('Astral')).toBe(accentHue('Astral'));
  });

  it('devuelve un hue valido', () => {
    for (const name of ['Astral', 'Emberfall', 'Neon Drift', '']) {
      const hue = accentHue(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('separa nombres distintos', () => {
    expect(accentHue('Astral')).not.toBe(accentHue('Emberfall'));
  });
});
