import { describe, expect, it } from 'vitest';

import { accentHue } from './accent';

describe('accentHue', () => {
  it('es estable para el mismo nombre', () => {
    expect(accentHue('Genshin')).toBe(accentHue('Genshin'));
  });

  it('devuelve un hue valido', () => {
    for (const name of ['Genshin', 'Terraria', 'Zenless Zone Zero', '']) {
      const hue = accentHue(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('separa nombres distintos', () => {
    expect(accentHue('Genshin')).not.toBe(accentHue('Terraria'));
  });
});
