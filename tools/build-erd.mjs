/* Genera docs/erd.html desde la base real.

   El problema de los ERD genericos es que trazan la linea de centro a centro, y
   con tablas de 15 columnas el trazo cruza el cuerpo del cuadro. Aqui se hace
   lo que hacen las herramientas serias:

     1. Layout por capas: cada tabla va a una columna segun de cuantas depende
        (rank = 1 + max(rank de sus FK)). Asi el flujo va de izquierda a derecha.
     2. Ruteo ortogonal con A* sobre una grilla de canales: cada tramo viaja por
        los pasillos entre columnas, nunca por encima de una tabla.
     3. Puertos: cada FK tiene su propia salida en el borde de la tabla.

   Lee el catalogo de la base local por psql (docker exec). */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTAINER = 'supabase_db_ZenithOptimizer';

/**
 * Docker por ruta absoluta, nunca por nombre suelto (S4036).
 *
 * `execFileSync('docker', ...)` deja que se ejecute el primer `docker` del PATH,
 * y el PATH puede incluir directorios escribibles por el usuario. Un binario
 * plantado ahi correria con los permisos de quien ejecuta el script. Las rutas
 * se arman desde las variables del sistema (no llevan un usuario escrito a
 * mano) y si ninguna existe se aborta en vez de caer al PATH.
 *
 * `DOCKER_BIN` permite forzar una instalacion fuera de lo habitual.
 */
const { ProgramFiles, ProgramW6432, LOCALAPPDATA } = process.env;

const DOCKER_CANDIDATES = [
  process.env.DOCKER_BIN,
  ProgramFiles && join(ProgramFiles, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
  ProgramW6432 && join(ProgramW6432, 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
  LOCALAPPDATA &&
    join(LOCALAPPDATA, 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'),
  '/usr/bin/docker',
  '/usr/local/bin/docker',
  '/opt/homebrew/bin/docker',
  '/Applications/Docker.app/Contents/Resources/bin/docker',
].filter(Boolean);

const dockerBin = DOCKER_CANDIDATES.find((candidate) => existsSync(candidate));
if (!dockerBin) {
  throw new Error(
    'No se encontro docker en las rutas conocidas. Defini DOCKER_BIN con la ruta completa.',
  );
}

const psql = (sql) =>
  execFileSync(dockerBin, ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-tAc', sql], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const cols = psql(`
  select c.relname || '|' || a.attname || '|' || format_type(a.atttypid, a.atttypmod) || '|' || a.attnotnull
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum;
`);

const pks = new Set(
  psql(`
    select c.relname || '|' || a.attname
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral unnest(k.conkey) as u(attnum)
    join pg_attribute a on a.attrelid = c.oid and a.attnum = u.attnum
    where k.contype = 'p' and n.nspname = 'public';
  `),
);

const fks = psql(`
  select c.conname || '|' || src.relname || '|' ||
         (select string_agg(a.attname, ',' order by k.ord)
            from unnest(c.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = src.oid and a.attnum = k.attnum) || '|' ||
         tgt.relname || '|' ||
         case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
              when 'c' then 'CASCADE' when 'n' then 'SET NULL' end
  from pg_constraint c
  join pg_class src on src.oid = c.conrelid
  join pg_class tgt on tgt.oid = c.confrelid
  join pg_namespace n on n.oid = src.relnamespace
  where c.contype = 'f' and n.nspname = 'public'
  order by src.relname, c.conname;
`).map((line) => {
  const [name, from, fromCols, to, onDelete] = line.split('|');
  return { name, from, fromCols: fromCols.split(','), to, onDelete };
});

const policies = psql(`
  select tablename || '|' || policyname || '|' || cmd
  from pg_policies where schemaname = 'public' order by tablename, policyname;
`).map((l) => {
  const [table, name, cmd] = l.split('|');
  return { table, name, cmd };
});

const tables = {};
for (const row of cols) {
  const [table, column, type, notnull] = row.split('|');
  (tables[table] ??= { name: table, columns: [] }).columns.push({
    name: column,
    type: type.replace(/\s+/g, ' '),
    notnull: notnull === 't',
    pk: pks.has(`${table}|${column}`),
    fk: fks.some((f) => f.from === table && f.fromCols.includes(column)),
  });
}

const CATALOG = new Set(['game', 'genre', 'game_genre', 'game_alias']);

// `profiles.id` apunta a `auth.users`, que Supabase administra y no esta en
// `public`: se dibuja como nodo minimo para no dejar la arista suelta.
for (const f of fks) {
  if (!tables[f.to]) {
    tables[f.to] = { name: f.to, columns: [{ name: 'id', type: 'uuid', notnull: true, pk: true, fk: false }] };
  }
}

const data = { tables: Object.values(tables), fks, policies, catalog: [...CATALOG] };

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Zenith Optimizer — modelo de datos</title>
<style>
  :root {
    --bg:#fbfbfc; --panel:#fff; --ink:#16181d; --muted:#6b7280; --line:#c9cfd9;
    --wire:#8b95a6; --accent:#2f6feb; --pk:#b45309; --fk:#0f766e; --catalog:#7c3aed;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0e1015; --panel:#161a22; --ink:#e6e9ef; --muted:#98a1b0; --line:#333c4d;
            --wire:#5e6a7e; --accent:#6da0ff; --pk:#f0a860; --fk:#4fd1c5; --catalog:#b18aff; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:13px/1.45 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif; }
  header { padding:13px 20px; border-bottom:1px solid var(--line); display:flex; gap:20px;
           align-items:baseline; flex-wrap:wrap; position:sticky; top:0; background:var(--bg);
           z-index:20; }
  h1 { font-size:15px; margin:0; font-weight:650; letter-spacing:-.01em; }
  .legend { display:flex; gap:15px; font-size:11.5px; color:var(--muted); flex-wrap:wrap; }
  .dot { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px;
         vertical-align:-1px; }
  .hint { color:var(--muted); font-size:11.5px; }
  #stage { position:relative; margin:0 auto; }
  #wires { position:absolute; inset:0; pointer-events:none; overflow:visible; }
  #wires path.edge { fill:none; stroke:var(--wire); stroke-width:1.5;
                     stroke-linejoin:round; stroke-linecap:round;
                     transition:stroke .12s, stroke-width .12s, opacity .12s; }
  #wires path.edge.on { stroke:var(--accent); stroke-width:2.3; }
  .tbl { position:absolute; background:var(--panel); border:1px solid var(--line);
         border-radius:8px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.05);
         transition:border-color .15s, box-shadow .15s, opacity .15s; }
  .tbl.catalog { border-color:color-mix(in srgb, var(--catalog) 55%, var(--line)); }
  .tbl.hot { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,
             var(--accent) 25%, transparent); }
  .tbl.dim { opacity:.34; }
  .tbl h2 { font-size:12.5px; margin:0; padding:7px 10px; font-weight:650; letter-spacing:.02em;
            border-bottom:1px solid var(--line); display:flex; justify-content:space-between;
            align-items:center; gap:8px; }
  .tbl.catalog h2 { color:var(--catalog); }
  .tbl h2 .n { font-size:10px; color:var(--muted); font-weight:500; }
  .col { display:grid; grid-template-columns:1fr auto; gap:10px; padding:2.5px 10px;
         font-size:11.8px; }
  .col:nth-child(even) { background:color-mix(in srgb, var(--ink) 2.5%, transparent); }
  .col .nm { display:flex; align-items:center; gap:5px; min-width:0; }
  .col .nm .tx { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .col .ty { color:var(--muted); font-size:10.5px; white-space:nowrap; }
  .tag { font-size:8.5px; font-weight:700; padding:1px 3px; border-radius:3px; flex:none; }
  .tag.pk { color:var(--pk); background:color-mix(in srgb, var(--pk) 15%, transparent); }
  .tag.fk { color:var(--fk); background:color-mix(in srgb, var(--fk) 15%, transparent); }
  .col.nn .ty::after { content:" •"; }
  footer { padding:12px 20px 28px; color:var(--muted); font-size:11.5px; }
  code { font-size:11px; background:color-mix(in srgb, var(--ink) 6%, transparent);
         padding:1px 4px; border-radius:3px; }
</style>
</head>
<body>
<header>
  <h1>Zenith Optimizer — modelo de datos</h1>
  <div class="legend">
    <span><span class="dot" style="background:var(--catalog)"></span><b>catálogo</b> nuevo</span>
    <span><span class="tag pk">PK</span> primaria</span>
    <span><span class="tag fk">FK</span> foránea</span>
    <span><b>•</b> obligatorio</span>
  </div>
  <div class="hint">El flujo va de izquierda a derecha. Pasá el mouse sobre una tabla para aislarla.</div>
</header>
<main id="stage">
  <svg id="wires"></svg>
</main>
<footer>
  <code>${fks.length}</code> claves foráneas y <code>${policies.length}</code> políticas RLS, leídas
  del esquema real. Los trazos corren por los pasillos entre columnas: no cruzan ninguna tabla.
</footer>
<script>
const DATA = ${JSON.stringify(data)};
</script>
<script>
const stage = document.getElementById('stage');
const svg = document.getElementById('wires');
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => { const e = document.createElementNS(NS, n);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };

/* ---------- 1. tablas ---------- */
const nodes = {};
for (const t of DATA.tables) {
  const box = document.createElement('section');
  box.className = 'tbl' + (DATA.catalog.includes(t.name) ? ' catalog' : '');
  box.dataset.table = t.name;
  const h = document.createElement('h2');
  h.innerHTML = '<span>' + t.name + '</span><span class="n">' + t.columns.length + ' col</span>';
  box.appendChild(h);
  for (const c of t.columns) {
    const row = document.createElement('div');
    row.className = 'col' + (c.notnull ? ' nn' : '');
    const tags = (c.pk ? '<span class="tag pk">PK</span>' : '') +
                 (c.fk ? '<span class="tag fk">FK</span>' : '');
    row.innerHTML = '<div class="nm">' + tags + '<span class="tx">' + c.name + '</span></div>' +
                    '<div class="ty">' + c.type + '</div>';
    box.appendChild(row);
  }
  stage.appendChild(box);
  nodes[t.name] = { box, w: 0, h: 0, x: 0, y: 0, col: 0 };
}

/* ---------- 2. capas: rank = 1 + max(rank de las FK) ---------- */
const rank = {};
const deps = {};
for (const f of DATA.fks) (deps[f.from] ??= []).push(f.to);
function rankOf(n, stack = new Set()) {
  if (rank[n] != null) return rank[n];
  if (stack.has(n)) return 0;
  stack.add(n);
  let r = 0;
  for (const d of deps[n] ?? []) r = Math.max(r, rankOf(d, stack) + 1);
  stack.delete(n);
  return (rank[n] = r);
}
for (const n of Object.keys(nodes)) rankOf(n);

const byRank = new Map();
for (const n of Object.keys(nodes)) {
  const r = rank[n];
  if (!byRank.has(r)) byRank.set(r, []);
  byRank.get(r).push(n);
}
const ranks = [...byRank.keys()].sort((a, b) => a - b);
const degree = {};
for (const f of DATA.fks) { degree[f.from] = (degree[f.from] ?? 0) + 1;
                            degree[f.to] = (degree[f.to] ?? 0) + 1; }
for (const list of byRank.values()) list.sort((a, b) => (degree[b] ?? 0) - (degree[a] ?? 0) ||
                                                         a.localeCompare(b));

/* ---------- 3. geometría ---------- */
const GUTTER = 108;   // pasillo entre columnas, donde viven los tramos verticales
const GAP = 26;        // separación vertical entre tablas de la misma columna
const PAD = 34;

for (const n of Object.values(nodes)) { n.w = n.box.offsetWidth; n.h = n.box.offsetHeight; }

const cols = ranks.map((r) => byRank.get(r));
const colW = cols.map((list) => Math.max(...list.map((n) => nodes[n].w)));
const colX = [];
let x = PAD;
for (let i = 0; i < cols.length; i++) { colX.push(x); x += colW[i] + GUTTER; }
const width = x - GUTTER + PAD;

let maxBottom = 0;
cols.forEach((list, ci) => {
  const heights = list.map((n) => nodes[n].h);
  const total = heights.reduce((a, b) => a + b, 0) + GAP * (list.length - 1);
  const startY = PAD + Math.max(0, (cols.reduce((acc, l) => Math.max(acc,
    l.reduce((s, n) => s + nodes[n].h, 0) + GAP * (l.length - 1)), 0) - total) / 2);
  let y = startY;
  list.forEach((n) => {
    nodes[n].x = colX[ci] + (colW[ci] - nodes[n].w) / 2;
    nodes[n].y = y;
    nodes[n].col = ci;
    y += nodes[n].h + GAP;
    maxBottom = Math.max(maxBottom, y);
  });
});
const height = maxBottom + PAD;

stage.style.width = width + 'px';
stage.style.height = height + 'px';
for (const n of Object.values(nodes)) {
  n.box.style.left = n.x + 'px';
  n.box.style.top = n.y + 'px';
}

/* ---------- 4. puertos: una salida por FK ---------- */
const edges = DATA.fks.map((f) => ({ ...f }));
const sidePorts = {};
for (const e of edges) {
  const a = nodes[e.from], b = nodes[e.to];
  const forward = b.col > a.col || (b.col === a.col && b.y > a.y);
  e.aSide = forward ? 'right' : 'left';
  e.bSide = forward ? 'left' : 'right';
  for (const key of [e.from + '|' + e.aSide, e.to + '|' + e.bSide]) {
    (sidePorts[key] ??= []).push(e);
  }
  if (e.aSide === 'left' && e.bSide === 'right' && e.from === e.to) {
    e.aSide = 'right'; e.bSide = 'left';
  }
}
const portY = new Map();
for (const [key, list] of Object.entries(sidePorts)) {
  const name = key.split('|')[0];
  const n = nodes[name];
  const top = n.y + 30, bottom = n.y + n.h - 14;
  list.sort((p, q) => (p.from === name ? p.to : p.from).localeCompare(q.from === name ? q.to : q.from));
  list.forEach((e, i) => {
    const y = list.length === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (list.length - 1);
    portY.set(e.name + '|' + key, y);
  });
}
for (const e of edges) {
  const a = nodes[e.from], b = nodes[e.to];
  e.ax = e.aSide === 'right' ? a.x + a.w : a.x;
  e.ay = portY.get(e.name + '|' + e.from + '|' + e.aSide);
  e.bx = e.bSide === 'right' ? b.x + b.w : b.x;
  e.by = portY.get(e.name + '|' + e.to + '|' + e.bSide);
}

/* ---------- 5. grilla de ruteo ---------- */
const xs = new Set([6, width - 6]);
const ys = new Set([6, height - 6]);
for (const n of Object.values(nodes)) { xs.add(n.x); xs.add(n.x + n.w); ys.add(n.y); ys.add(n.y + n.h); }
colX.forEach((cx, i) => {
  const right = cx + colW[i];
  const nextLeft = i + 1 < colX.length ? colX[i + 1] : width - PAD;
  for (const t of [0.18, 0.38, 0.5, 0.62, 0.82]) xs.add(right + (nextLeft - right) * t);
});
for (const e of edges) { ys.add(e.ay); ys.add(e.by); }
const X = [...xs].sort((a, b) => a - b);
const Y0 = [...ys].sort((a, b) => a - b);
// Se intercalan valores medios para dar flexibilidad vertical al ruteo.
const Y = [];
for (let i = 0; i < Y0.length; i++) {
  Y.push(Y0[i]);
  if (i + 1 < Y0.length) { const d = Y0[i + 1] - Y0[i]; if (d > 16) Y.push(Y0[i] + d / 2); }
}

const rects = Object.values(nodes).map((n) => ({ l: n.x, t: n.y, r: n.x + n.w, b: n.y + n.h, name: n.name }));
const inRect = (px, py) => rects.find((r) => px > r.l + 1.5 && px < r.r - 1.5 && py > r.t + 1.5 && py < r.b - 1.5);
const crossH = (y, x1, x2) => rects.some((r) => y > r.t + 1.5 && y < r.b - 1.5 &&
  Math.min(x1, x2) < r.r - 1.5 && Math.max(x1, x2) > r.l + 1.5);
const crossV = (px, y1, y2) => rects.some((r) => px > r.l + 1.5 && px < r.r - 1.5 &&
  Math.min(y1, y2) < r.b - 1.5 && Math.max(y1, y2) > r.t + 1.5);

const xi = new Map(X.map((v, i) => [v, i]));
const yi = new Map(Y.map((v, i) => [v, i]));
const used = new Set();

function route(e) {
  const sx = X.reduce((best, v) => Math.abs(v - e.ax) < Math.abs(best - e.ax) ? v : best, X[0]);
  const sy = Y.reduce((best, v) => Math.abs(v - e.ay) < Math.abs(best - e.ay) ? v : best, Y[0]);
  const tx = X.reduce((best, v) => Math.abs(v - e.bx) < Math.abs(best - e.bx) ? v : best, X[0]);
  const ty = Y.reduce((best, v) => Math.abs(v - e.by) < Math.abs(best - e.by) ? v : best, Y[0]);
  const S = [xi.get(sx), yi.get(sy)], T = [xi.get(tx), yi.get(ty)];

  const key = (i, j) => i + ',' + j;
  const open = new Map([[key(...S), { i: S[0], j: S[1], g: 0, dir: -1, prev: null }]]);
  const seen = new Map();
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = null;

  while (open.size) {
    let cur = null, curK = null;
    for (const [k, v] of open) {
      if (!cur || v.g + Math.abs(X[v.i] - X[T[0]]) + Math.abs(Y[v.j] - Y[T[1]]) <
                 cur.g + Math.abs(X[cur.i] - X[T[0]]) + Math.abs(Y[cur.j] - Y[T[1]])) { cur = v; curK = k; }
    }
    open.delete(curK);
    if (cur.i === T[0] && cur.j === T[1]) { best = cur; break; }
    const sk = key(cur.i, cur.j);
    if ((seen.get(sk) ?? Infinity) <= cur.g) continue;
    seen.set(sk, cur.g);

    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIRS[d];
      const ni = cur.i + dx, nj = cur.j + dy;
      if (ni < 0 || nj < 0 || ni >= X.length || nj >= Y.length) continue;
      const nx = X[ni], ny = Y[nj];
      if (inRect(nx, ny)) continue;
      const px = X[cur.i], py = Y[cur.j];
      if (dx) { if (crossH(py, px, nx)) continue; } else { if (crossV(px, py, ny)) continue; }
      const step = Math.abs(dx ? nx - px : ny - py);
      const bend = cur.dir !== -1 && cur.dir !== d ? 30 : 0;
      const share = used.has(px + ',' + py + '>' + nx + ',' + ny) ||
                    used.has(nx + ',' + ny + '>' + px + ',' + py) ? 22 : 0;
      const g = cur.g + step + bend + share;
      const nk = key(ni, nj);
      const prev = open.get(nk);
      if (!prev || g < prev.g) open.set(nk, { i: ni, j: nj, g, dir: d, prev: cur });
    }
  }

  const pts = [];
  for (let p = best; p; p = p.prev) pts.unshift({ x: X[p.i], y: Y[p.j] });
  for (let i = 0; i < pts.length - 1; i++) {
    used.add(pts[i].x + ',' + pts[i].y + '>' + pts[i + 1].x + ',' + pts[i + 1].y);
  }
  // extremos exactos en el puerto
  if (pts.length) { pts[0] = { x: e.ax, y: e.ay }; pts[pts.length - 1] = { x: e.bx, y: e.by }; }
  return pts;
}

/* ---------- 6. dibujo ---------- */
const R = 8;
function toPath(pts) {
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = clean[clean.length - 1];
    if (Math.abs(p.x - q.x) > 0.4 || Math.abs(p.y - q.y) > 0.4) clean.push(p);
  }
  if (clean.length < 2) return '';
  let d = 'M' + clean[0].x + ',' + clean[0].y;
  for (let i = 1; i < clean.length - 1; i++) {
    const p = clean[i], a = clean[i - 1], b = clean[i + 1];
    const d1 = Math.hypot(p.x - a.x, p.y - a.y), d2 = Math.hypot(b.x - p.x, b.y - p.y);
    const r = Math.min(R, d1 / 2, d2 / 2);
    const u1 = { x: (p.x - a.x) / d1, y: (p.y - a.y) / d1 };
    const u2 = { x: (b.x - p.x) / d2, y: (b.y - p.y) / d2 };
    d += ' L' + (p.x - u1.x * r) + ',' + (p.y - u1.y * r) +
         ' Q' + p.x + ',' + p.y + ' ' + (p.x + u2.x * r) + ',' + (p.y + u2.y * r);
  }
  const last = clean[clean.length - 1];
  d += ' L' + last.x + ',' + last.y;
  return d;
}

const svgEdges = [];
for (const e of edges) {
  const pts = route(e);
  const path = el('path', { d: toPath(pts), class: 'edge' });
  const title = el('title');
  title.textContent = e.from + '.' + e.fromCols.join(',') + ' → ' + e.to +
                      '  (on delete ' + e.onDelete + ')';
  path.appendChild(title);
  svg.appendChild(path);
  svgEdges.push({ path, from: e.from, to: e.to });
}

/* ---------- 7. foco ---------- */
function focus(table) {
  const near = new Set(table ? [table] : []);
  for (const f of DATA.fks) {
    if (f.from === table) near.add(f.to);
    if (f.to === table) near.add(f.from);
  }
  for (const n of Object.values(nodes)) {
    n.box.classList.toggle('hot', n.box.dataset.table === table);
    n.box.classList.toggle('dim', !!table && !near.has(n.box.dataset.table));
  }
  for (const w of svgEdges) {
    const on = table && (w.from === table || w.to === table);
    w.path.classList.toggle('on', !!on);
    w.path.style.opacity = table && !on ? '.12' : '1';
  }
}
for (const n of Object.values(nodes)) {
  n.box.addEventListener('mouseenter', () => focus(n.box.dataset.table));
  n.box.addEventListener('mouseleave', () => focus(null));
}

document.body.dataset.ready = '1';
</script>
</body>
</html>
`;

writeFileSync(join(__dirname, '..', 'docs', 'erd.html'), html, 'utf8');
console.log(`erd.html generado: ${data.tables.length} tablas, ${fks.length} FK, ${policies.length} politicas`);
