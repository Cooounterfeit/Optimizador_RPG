#!/usr/bin/env node
/**
 * Guardia del principio de F6.3: el producto conoce generos, no juegos.
 *
 * Recorre el codigo y los datos que se publican (apps/ y libs/), y falla si
 * encuentra el nombre de un juego concreto o el CDN que estaba hardcodeado.
 * `demo/` queda fuera: es el prototipo archivado y no forma parte del build.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');

const targets = [
  'apps/web/src',
  'apps/web/public',
  'apps/web-e2e/src',
  'apps/web-e2e/fixtures',
  'libs/inventory/src',
  'libs/shared-types/src',
  'libs/data-access/src',
  'libs/core-engine/src',
];

const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css']);
const skip = new Set(['node_modules', 'dist', 'out-tsc', 'test-output', 'coverage', '.nx']);

const deny = [
  [/\bgenshin\b/i, 'juego concreto'],
  [/\bwuva\b/i, 'juego concreto'],
  [/\bwuthering\b/i, 'juego concreto'],
  [/\bdeadlock\b/i, 'juego concreto'],
  [/\bhonkai\b/i, 'juego concreto'],
  [/\bzenless\b/i, 'juego concreto'],
  [/\bwarframe\b/i, 'juego concreto'],
  [/\bterraria\b/i, 'juego concreto'],
  [/\bpath of exile\b/i, 'juego concreto'],
  [/\bmonster hunter\b/i, 'juego concreto'],
  [/\bdestiny 2\b/i, 'juego concreto'],
  [/\blast epoch\b/i, 'juego concreto'],
  [/\b elden ring\b/i, 'juego concreto'],
  [/\bdark souls\b/i, 'juego concreto'],
  [/\bworld of warcraft\b/i, 'juego concreto'],
  [/\bleague of legends\b/i, 'juego concreto'],
  [/gi\.yatta\.moe/i, 'CDN hardcodeado'],
];

/**
 * Reglas que no pueden vivir en la libreria generica. Los tests usan datos
 * sinteticos, asi que tambien se revisan.
 */
const ruleDeny = [
  [/\bpyro\b/i, 'elemento de un juego concreto'],
  [/\bhydro\b/i, 'elemento de un juego concreto'],
  [/\belectro\b/i, 'elemento de un juego concreto'],
  [/\bcryo\b/i, 'elemento de un juego concreto'],
  [/\banemo\b/i, 'elemento de un juego concreto'],
  [/\bgeo\b/i, 'elemento de un juego concreto'],
  [/\bdendro\b/i, 'elemento de un juego concreto'],
  [/\bflower\b/i, 'ranura de un juego concreto'],
  [/\bplume\b/i, 'ranura de un juego concreto'],
  [/\bsands\b/i, 'ranura de un juego concreto'],
  [/\bgoblet\b/i, 'ranura de un juego concreto'],
  [/\bcirclet\b/i, 'ranura de un juego concreto'],
  [/\bwt_/i, 'convencion de requisito de un juego concreto'],
  [/\b4780\b/, 'valor de un juego concreto'],
  [/\b717\b/, 'valor de un juego concreto'],
  [/\bMAIN_STAT\b/, 'tabla de un juego concreto'],
  [/\bELEMENTAL_DMG\b/, 'tabla de un juego concreto'],
  [/\bSLOT_NAMES\b/, 'tabla de un juego concreto'],
];

const files = [];

const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    const dot = entry.name.lastIndexOf('.');
    if (dot < 0 || !extensions.has(entry.name.slice(dot))) continue;
    files.push(full);
  }
};

for (const target of targets) {
  const full = join(root, target);
  try {
    if (statSync(full).isDirectory()) walk(full);
  } catch {
    // Un target que aun no existe no invalida la guardia.
  }
}

const hits = [];

for (const file of files) {
  const relativePath = relative(root, file);
  const patterns = relativePath.startsWith('libs/inventory/src')
    ? [...deny, ...ruleDeny]
    : deny;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const [pattern, reason] of patterns) {
      if (pattern.test(line)) {
        hits.push(`${relativePath}:${index + 1}: ${reason} -> ${line.trim()}`);
      }
    }
  });
}

if (hits.length > 0) {
  console.error('check:genres encontro nombres, reglas o CDNs de juegos en el producto:\n');
  for (const hit of hits) console.error(`  ${hit}`);
  console.error('\nMueve ese dato a la plantilla, al catalogo o a demo/. Ver F6.4.');
  process.exit(1);
}

console.log(`check:genres OK (${files.length} archivos revisados)`);
