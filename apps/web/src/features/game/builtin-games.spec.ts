import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateTemplate } from '@zenith/core-engine';
import type { Item } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { builtinCards, findBuiltinGame } from './builtin-games';

/**
 * En jsdom `import.meta.url` no siempre es `file:`, asi que se ubica la raiz del
 * workspace desde el directorio de trabajo. Nx puede correr en la raiz o en el
 * proyecto, por eso se prueba hacia arriba.
 */
const workspaceRoot = (() => {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, '..'), resolve(cwd, '../..'), resolve(cwd, '../../..')];
  const found = candidates.find((candidate) =>
    existsSync(resolve(candidate, 'apps/web/public/seeds/gacha-demo.zenith.json')),
  );
  if (!found) throw new Error('Workspace root not found');
  return found;
})();

const read = (relative: string): unknown =>
  JSON.parse(readFileSync(resolve(workspaceRoot, relative), 'utf8'));

const seed = read('apps/web/public/seeds/gacha-demo.zenith.json');

describe('semilla local sintetica', () => {
  it('valida con el validador completo del motor', () => {
    const pkg = seed as { template: unknown; items: Item[] };
    const report = validateTemplate(pkg.template, pkg.items);
    const errors = report.issues.filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('se ofrece como tarjeta integrada en el catalogo mock', () => {
    expect(builtinCards.some((card) => card.id === 'gacha-demo')).toBe(true);
    expect(findBuiltinGame('gacha-demo')?.card.gameName).toBe('Astral Forge');
  });
});
