#!/usr/bin/env node
/**
 * Servidor estatico de Zenith
 * ===========================
 * Zenith no tiene backend: el motor corre entero en el navegador del que lo
 * usa. Servirlo es, literalmente, entregar archivos. Por eso aqui no hay
 * Express ni ninguna dependencia — solo el `http` de Node.
 *
 * Eso no es minimalismo por deporte. Una dependencia en el servidor es una
 * dependencia que hay que actualizar, que puede tener un CVE y que obliga a
 * `npm install` en la maquina expuesta. Con cero dependencias, la superficie de
 * ataque del servidor es la de Node y nada mas.
 *
 * Dos detalles que SI importan y que un `python -m http.server` hace mal:
 *
 *  · El tipo MIME de los .js. El optimizador corre en un Web Worker de tipo
 *    modulo, y el navegador RECHAZA un modulo que no llegue como
 *    `text/javascript`. Servido mal, la app carga pero no calcula nada.
 *
 *  · El cacheado. Vite pone un hash en el nombre de cada bundle, asi que esos
 *    se pueden cachear un ano sin riesgo; el index.html NUNCA, o los
 *    companeros seguirian viendo la version de ayer despues de cada despliegue.
 *
 *   node deploy/serve.mjs [--port 4173] [--host 0.0.0.0] [--dir dist]
 */

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const arg = (nombre, porDefecto) => {
  const i = process.argv.indexOf(`--${nombre}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto
}

const PORT = Number(process.env.PORT ?? arg('port', 4173))
const HOST = process.env.HOST ?? arg('host', '0.0.0.0')
const RAIZ = resolve(arg('dir', 'dist'))

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',   // imprescindible para el Web Worker
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

if (!existsSync(RAIZ)) {
  console.error(`No existe ${RAIZ}. Ejecuta "npm run build" antes de servir.`)
  process.exit(1)
}

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])

  // normalize() colapsa los ".."; sin esto, una peticion a /../../etc/passwd
  // se saldria de dist y serviria cualquier archivo de la maquina.
  const rel = normalize(url).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '')
  let archivo = join(RAIZ, rel)
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end('403'); return }

  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html')

  // Zenith es una sola pagina: cualquier ruta desconocida devuelve el index y
  // deja que la app decida. Asi un enlace compartido nunca da 404.
  if (!existsSync(archivo)) archivo = join(RAIZ, 'index.html')

  const ext = extname(archivo).toLowerCase()
  const inmutable = /-[A-Za-z0-9_-]{8,}\.(js|css|woff2)$/.test(archivo)

  res.writeHead(200, {
    'Content-Type': TIPOS[ext] ?? 'application/octet-stream',
    'Cache-Control': inmutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    // El motor usa Web Workers; estas dos cabeceras no le hacen falta hoy, pero
    // son las que habilitan SharedArrayBuffer si algun dia se paraleliza.
    'X-Content-Type-Options': 'nosniff',
  })
  createReadStream(archivo).pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`Zenith sirviendose desde ${RAIZ}`)
  console.log(`  local:  http://localhost:${PORT}`)
  if (HOST === '0.0.0.0') console.log(`  en red: http://<ip-de-esta-maquina>:${PORT}`)
})

for (const s of ['SIGINT', 'SIGTERM']) {
  process.on(s, () => { server.close(() => process.exit(0)) })
}
