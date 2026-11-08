#!/usr/bin/env node
/**
 * Sube los assets de un juego a Supabase Storage.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node tools/upload-game-assets.mjs ruta/al/manifest.json
 *
 * El manifiesto (fuera del repo) declara el bucket y una lista de
 * `{ source, path, contentType }`. `source` puede ser una URL o un archivo
 * local. La service role key se lee del entorno y nunca se escribe en el repo.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Falta la ruta del manifiesto.');
  process.exit(2);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
if (!manifest.bucket || !Array.isArray(manifest.files)) {
  console.error('El manifiesto necesita "bucket" y "files".');
  process.exit(2);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const readBody = async (source) => {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return readFileSync(resolve(source));
};

const run = async (file) => {
  const body = await readBody(file.source);
  const { error } = await supabase.storage
    .from(manifest.bucket)
    .upload(file.path, body, {
      contentType: file.contentType,
      cacheControl: '31536000',
      upsert: true,
    });
  if (error) throw new Error(error.message);
};

let uploaded = 0;
let failed = 0;
const queue = [...manifest.files];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length > 0) {
    const file = queue.shift();
    try {
      await run(file);
      uploaded++;
      if (uploaded % 50 === 0) console.log(`${uploaded}/${manifest.files.length}`);
    } catch (cause) {
      failed++;
      console.error(`Fallo ${file.path}: ${cause instanceof Error ? cause.message : cause}`);
    }
  }
});

await Promise.all(workers);
console.log(`Subidos ${uploaded} de ${manifest.files.length}; fallos: ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
