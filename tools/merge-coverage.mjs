#!/usr/bin/env node
/**
 * Combina los reportes lcov de cada proyecto en uno solo, con rutas relativas a
 * la raiz del repositorio.
 *
 * Vitest escribe `SF:src/lib/optimizer.ts` relativo a la raiz de cada proyecto.
 * SonarCloud resuelve esas rutas contra la raiz del repositorio, asi que sin el
 * prefijo del proyecto no encuentra ningun archivo y la cobertura queda en cero.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const skip = new Set(['node_modules', 'dist', 'out-tsc', '.nx', 'demo']);
const outDir = join(root, 'coverage');

const reports = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== outDir) walk(full);
    } else if (entry.name === 'lcov.info') {
      reports.push(full);
    }
  }
}

walk(root);

const blocks = [];
let files = 0;

for (const report of reports) {
  const projectDir = report.slice(root.length + 1, report.indexOf('test-output')).replace(/\\/g, '/');
  const lines = readFileSync(report, 'utf8').split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      current = [`SF:${projectDir}${line.slice(3).replace(/\\/g, '/')}`];
      files += 1;
      continue;
    }
    if (!current) continue;
    current.push(line);
    if (line === 'end_of_record') {
      blocks.push(current.join('\n'));
      current = null;
    }
  }
}

if (!files) {
  console.error('No se encontro cobertura. Ejecuta antes: npx nx run-many -t test --coverage');
  process.exit(1);
}

const out = join(root, 'coverage', 'lcov.info');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, blocks.join('\n') + '\n', 'utf8');

console.log(`lcov combinado: ${files} archivos de ${reports.length} reportes -> coverage/lcov.info`);
if (!existsSync(out)) process.exit(1);
