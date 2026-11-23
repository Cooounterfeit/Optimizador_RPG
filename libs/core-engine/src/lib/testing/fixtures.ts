import { readFileSync } from 'node:fs';

const DIR = '../../../../../demo/public/examples/';

/**
 * Lee un fixture de `demo/public/examples`, tolerando que el symlink no se haya
 * materializado.
 *
 * En Linux y macOS esos archivos son enlaces reales. En Windows, con
 * `core.symlinks=false`, Git los deja como un archivo de texto que contiene el
 * nombre del destino. Seguir el puntero a mano mantiene la suite verde en los
 * tres sistemas, que es lo que se espera de una verificación reproducible.
 */
export const loadFixture = <T = unknown>(file: string): T => {
  let actual = file;
  for (let saltos = 0; saltos < 5; saltos++) {
    const texto = readFileSync(new URL(DIR + actual, import.meta.url), 'utf8').trim();
    const esPuntero = !texto.startsWith('{') && !texto.startsWith('[') && texto.endsWith('.json');
    if (!esPuntero) return JSON.parse(texto) as T;
    actual = texto;
  }
  throw new Error(`No se pudo resolver el fixture ${file}: demasiados saltos de symlink`);
};
