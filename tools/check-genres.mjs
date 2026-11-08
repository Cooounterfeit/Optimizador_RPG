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
  'libs/gacha/src',
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
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const [pattern, reason] of deny) {
      if (pattern.test(line)) {
        hits.push(`${relative(root, file)}:${index + 1}: ${reason} -> ${line.trim()}`);
      }
    }
  });
}

if (hits.length > 0) {
  console.error('check:genres encontro nombres de juegos o CDNs de juegos en el producto:\n');
  for (const hit of hits) console.error(`  ${hit}`);
  console.error('\nMueve ese dato a Supabase o a demo/. Ver F6.3.');
  process.exit(1);
}

console.log(`check:genres OK (${files.length} archivos revisados)`);
