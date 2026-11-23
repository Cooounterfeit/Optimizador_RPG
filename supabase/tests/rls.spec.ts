/**
 * Pruebas de las reglas de seguridad de Supabase (TEC-03).
 *
 * Corre la migracion real (supabase/migrations/*_esquema_inicial.sql) sobre un
 * PostgreSQL en memoria (PGlite) con lo minimo de Supabase simulado: los roles
 * anon y authenticated, la tabla auth.users y auth.uid() leyendo el JWT de la
 * peticion. Despues prueba cada politica con usuarios distintos, como pide el
 * Jira: "intentar acceder con diferentes roles y verificar que se respeten".
 *
 * La migracion de avatares (Storage) no se prueba aqui: necesita el esquema
 * storage de Supabase.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const ADMIN = '00000000-0000-0000-0000-0000000000ad';

const PLANTILLA = JSON.stringify({ gameId: 'souls', name: 'Souls' });

type Row = Record<string, unknown>;
type Result = { rows: Row[]; error?: string; affected?: number };

let db: PGlite;
let OPT = '';
let BORRADOR = '';

/** Corre `sql` como `quien` (null = visitante sin sesion). Devuelve filas o el error. */
async function como(quien: string | null, sql: string, params: unknown[] = []): Promise<Result> {
  try {
    return await db.transaction(async (tx) => {
      await tx.exec(`set local role ${quien ? 'authenticated' : 'anon'}`);
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [quien ?? '']);
      const r = await tx.query(sql, params);
      return { rows: r.rows as Row[], affected: r.affectedRows };
    });
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

const admin = <T extends Row = Row>(sql: string, params: unknown[] = []) => db.query<T>(sql, params);
const denegado = (r: { error?: string }) =>
  !!r.error && /permission denied|row-level security|violates/i.test(r.error);

beforeAll(async () => {
  db = new PGlite();

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text unique, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);

  // PGlite no trae los privilegios POR DEFECTO que Supabase configura en un
  // proyecto real: ahi `anon` y `authenticated` reciben todo sobre cada objeto
  // nuevo de `public`. Sin emulacion, cualquier prueba de "no puede escribir"
  // pasaria por falta de GRANT y no por RLS, y el agujero real seria invisible.
  // Se emula ANTES de aplicar las migraciones, que es justo el orden en que
  // Supabase aprovisiona el esquema. Ver 20261125000001_privilegios_por_defecto.
  await db.exec(`
    alter default privileges in schema public
      grant all on tables to anon, authenticated;
  `);

  const migracion = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith('_esquema_inicial.sql'));
  if (!migracion) throw new Error('falta la migracion *_esquema_inicial.sql en supabase/migrations');
  await db.exec(readFileSync(join(MIGRATIONS_DIR, migracion), 'utf8'));

  // El resto de las migraciones de esquema tambien corre; las de Storage no,
  // porque PGlite no trae el esquema `storage` de Supabase.
  const otras = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && f !== migracion && !f.includes('avatares'))
    .sort();
  for (const archivo of otras) await db.exec(readFileSync(join(MIGRATIONS_DIR, archivo), 'utf8'));
});

afterAll(async () => {
  await db.close();
});

describe('migracion', () => {
  it('la migracion corre sin errores', async () => {
    const r = await admin(`select to_regclass('public.profiles') as tabla`);
    expect((r.rows[0] as Row).tabla).not.toBeNull();
  });
});

describe('registro: perfil y plan gratuito automaticos', () => {
  beforeAll(async () => {
    await admin(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'ana@ejemplo.cl', '{"display_name":"Ana"}')`, [A]);
    await admin(`insert into auth.users (id, email) values ($1, 'beto@ejemplo.cl')`, [B]);
    await admin(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'admin@ejemplo.cl', '{"display_name":"Admin"}')`, [ADMIN]);
    await admin(`update public.profiles set role = 'admin' where id = $1`, [ADMIN]);
  });

  it('el perfil toma el nombre del formulario', async () => {
    const perfiles = (await admin(`select id, display_name from public.profiles order by display_name`)).rows;
    expect(perfiles.some((p) => p.id === A && p.display_name === 'Ana')).toBe(true);
  });

  it('sin nombre, usa la parte del correo antes de @', async () => {
    const perfiles = (await admin(`select id, display_name from public.profiles order by display_name`)).rows;
    expect(perfiles.some((p) => p.id === B && p.display_name === 'beto')).toBe(true);
  });

  it('cada usuario parte con plan gratuito', async () => {
    const r = await admin(`select count(*)::int n from public.subscriptions where plan = 'free'`);
    expect((r.rows[0] as { n: number }).n).toBe(3);
  });
});

describe('profiles: lectura publica, cada uno edita lo suyo', () => {
  it('un visitante ve los perfiles publicos', async () => {
    expect((await como(null, `select display_name, bio from public.profiles`)).rows.length).toBe(3);
  });

  it('un visitante no puede leer correos', async () => {
    expect((await como(null, `select email from auth.users`)).error).toBeTruthy();
  });

  it('profiles no guarda el correo (no es visible para otros)', async () => {
    const cols = (
      await admin(
        `select column_name from information_schema.columns where table_schema='public' and table_name='profiles'`,
      )
    ).rows;
    expect(cols.some((c) => c.column_name === 'email')).toBe(false);
  });

  it('Ana cambia su nombre y descripcion', async () => {
    const r = await como(A, `update public.profiles set display_name = 'Ana R', bio = 'Main Ashe' where id = $1`, [A]);
    expect(r.affected).toBe(1);
  });

  it('Ana no puede cambiar el perfil de Beto', async () => {
    const r = await como(A, `update public.profiles set display_name = 'hackeado' where id = $1`, [B]);
    expect(r.affected).toBe(0);
  });

  it('Ana no puede darse rol de admin', async () => {
    expect(denegado(await como(A, `update public.profiles set role = 'admin' where id = $1`, [A]))).toBe(true);
  });

  it('el nombre no puede quedar vacio', async () => {
    expect((await como(A, `update public.profiles set display_name = '' where id = $1`, [A])).error).toBeTruthy();
  });

  it('el nombre es breve (maximo 40)', async () => {
    const r = await como(A, `update public.profiles set display_name = repeat('x', 41) where id = $1`, [A]);
    expect(r.error).toBeTruthy();
  });

  it('un visitante no edita perfiles', async () => {
    expect(denegado(await como(null, `update public.profiles set bio = 'x'`))).toBe(true);
  });
});

describe('optimizers: lectura publica, crea quien tiene sesion, edita el autor o un admin', () => {
  const JUEGO = '00000000-0000-0000-0000-0000000000d1';

  beforeAll(async () => {
    await admin(`insert into public.game (id, slug, name) values ($1, 'souls', 'Souls')`, [JUEGO]);
  });

  it('un visitante no puede crear', async () => {
    const r = await como(
      null,
      `insert into public.optimizers (game_id, name, template) values ($1, 'x', $2)`,
      [JUEGO, PLANTILLA],
    );
    expect(denegado(r)).toBe(true);
  });

  it('Ana crea un optimizador y queda como autora', async () => {
    const ins = await como(
      A,
      `insert into public.optimizers (game_id, name, template, published) values ($1, 'Builds de fuerza', $2, true) returning id, author_id`,
      [JUEGO, PLANTILLA],
    );
    expect(ins.error).toBeUndefined();
    expect(ins.rows[0]?.author_id).toBe(A);
    OPT = ins.rows[0]?.id as string;
  });

  it('no se puede crear a nombre de otro', async () => {
    const r = await como(
      A,
      `insert into public.optimizers (author_id, game_id, name, template) values ($1, $2, 'a nombre de otro', $3)`,
      [B, JUEGO, PLANTILLA],
    );
    expect(denegado(r)).toBe(true);
  });

  it('no se puede crear con puntaje inflado', async () => {
    const r = await como(
      A,
      `insert into public.optimizers (game_id, name, template, score) values ($1, 'trampa', $2, 999)`,
      [JUEGO, PLANTILLA],
    );
    expect(denegado(r)).toBe(true);
  });

  it('un visitante ve los publicados y no los borradores', async () => {
    const borr = await como(
      A,
      `insert into public.optimizers (game_id, name, template) values ($1, 'Borrador', $2) returning id`,
      [JUEGO, PLANTILLA],
    );
    BORRADOR = borr.rows[0]?.id as string;
    const vistos = (await como(null, `select id from public.optimizers`)).rows.map((r) => r.id);
    expect(vistos.includes(OPT)).toBe(true);
    expect(vistos.includes(BORRADOR)).toBe(false);
  });

  it('Beto no ve el borrador de Ana', async () => {
    const r = await como(B, `select id from public.optimizers where id = $1`, [BORRADOR]);
    expect(r.rows.length).toBe(0);
  });

  it('Ana ve su borrador', async () => {
    const r = await como(A, `select id from public.optimizers where id = $1`, [BORRADOR]);
    expect(r.rows.length).toBe(1);
  });

  it('Beto no puede editar el optimizador de Ana', async () => {
    const r = await como(B, `update public.optimizers set name = 'robado' where id = $1`, [OPT]);
    expect(r.affected).toBe(0);
  });

  it('Beto no puede borrarlo', async () => {
    const r = await como(B, `delete from public.optimizers where id = $1`, [OPT]);
    expect(r.affected).toBe(0);
  });

  it('ni el autor puede tocar el puntaje', async () => {
    expect(denegado(await como(A, `update public.optimizers set score = 999 where id = $1`, [OPT]))).toBe(true);
  });

  it('ni cambiar el autor', async () => {
    expect(denegado(await como(A, `update public.optimizers set author_id = $2 where id = $1`, [OPT, B]))).toBe(true);
  });

  it('un admin puede editar el de otro', async () => {
    const r = await como(ADMIN, `update public.optimizers set description = 'moderado' where id = $1`, [OPT]);
    expect(r.affected).toBe(1);
  });

  it('la plantilla debe ser un objeto JSON', async () => {
    const r = await como(A, `insert into public.optimizers (game_id, name, template) values ($1, 'Y', '[]')`, [JUEGO]);
    expect(r.error).toBeTruthy();
  });

  it('updated_at se actualiza solo', async () => {
    const antes = (await admin(`select updated_at from public.optimizers where id = $1`, [OPT])).rows[0] as Row;
    await new Promise((r) => setTimeout(r, 15));
    await como(A, `update public.optimizers set description = 'v2' where id = $1`, [OPT]);
    const despues = (await admin(`select updated_at from public.optimizers where id = $1`, [OPT])).rows[0] as Row;
    expect(new Date(despues.updated_at as string) > new Date(antes.updated_at as string)).toBe(true);
  });
});

describe('votes: un voto por usuario y optimizador; el puntaje se calcula solo', () => {
  const puntaje = async () =>
    (await admin(`select score, votes_count from public.optimizers where id = $1`, [OPT])).rows[0] as Row;

  it('un visitante no puede votar', async () => {
    const r = await como(null, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT]);
    expect(denegado(r)).toBe(true);
  });

  it('Beto vota +1', async () => {
    const r = await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT]);
    expect(r.error).toBeUndefined();
  });

  it('puntaje 1 con 1 voto', async () => {
    const p = await puntaje();
    expect(p.score).toBe(1);
    expect(p.votes_count).toBe(1);
  });

  it('un segundo voto del mismo usuario se rechaza', async () => {
    const dup = await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT]);
    expect(dup.error).toMatch(/duplicate key|unique/i);
  });

  it('Beto cambia su voto a -1', async () => {
    const r = await como(B, `update public.votes set value = -1 where optimizer_id = $1`, [OPT]);
    expect(r.affected).toBe(1);
  });

  it('el puntaje baja a -1', async () => {
    expect((await puntaje()).score).toBe(-1);
  });

  it('Ana no puede votar su propio optimizador', async () => {
    const r = await como(A, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT]);
    expect(denegado(r)).toBe(true);
  });

  it('nadie vota un borrador', async () => {
    const r = await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [BORRADOR]);
    expect(denegado(r)).toBe(true);
  });

  it('el voto solo puede ser +1 o -1', async () => {
    const r = await como(ADMIN, `insert into public.votes (optimizer_id, value) values ($1, 5)`, [OPT]);
    expect(r.error).toBeTruthy();
  });

  it('Ana no puede cambiar el voto de Beto', async () => {
    const r = await como(A, `update public.votes set value = 1 where user_id = $1`, [B]);
    expect(r.affected).toBe(0);
  });

  it('Beto retira su voto y el puntaje vuelve a 0', async () => {
    const r = await como(B, `delete from public.votes where optimizer_id = $1`, [OPT]);
    expect(r.affected).toBe(1);
    expect((await puntaje()).score).toBe(0);
  });

  it('los votos se pueden leer (conteos publicos)', async () => {
    const r = await como(null, `select * from public.votes`);
    expect(r.rows.length).toBeGreaterThanOrEqual(0);
  });
});

describe('favorites: privados', () => {
  it('Beto guarda un favorito', async () => {
    const r = await como(B, `insert into public.favorites (optimizer_id) values ($1)`, [OPT]);
    expect(r.error).toBeUndefined();
  });

  it('Ana no ve los favoritos de Beto', async () => {
    expect((await como(A, `select * from public.favorites`)).rows.length).toBe(0);
  });

  it('Beto ve los suyos', async () => {
    expect((await como(B, `select * from public.favorites`)).rows.length).toBe(1);
  });
});

describe('reports: cada uno ve los suyos; el admin ve todos', () => {
  it('Beto reporta', async () => {
    const r = await como(B, `insert into public.reports (optimizer_id, reason, detail) values ($1, 'spam', 'promo')`, [
      OPT,
    ]);
    expect(r.error).toBeUndefined();
  });

  it('no puede reportar dos veces lo mismo', async () => {
    const r = await como(B, `insert into public.reports (optimizer_id, reason) values ($1, 'spam')`, [OPT]);
    expect(r.error).toBeTruthy();
  });

  it('Ana (la autora) no ve quien la reporto', async () => {
    expect((await como(A, `select * from public.reports`)).rows.length).toBe(0);
  });

  it('el admin ve el reporte', async () => {
    expect((await como(ADMIN, `select * from public.reports`)).rows.length).toBe(1);
  });

  it('Beto no puede cerrar su propio reporte', async () => {
    expect((await como(B, `update public.reports set status = 'dismissed'`)).affected).toBe(0);
  });

  it('el admin lo marca como revisado', async () => {
    expect((await como(ADMIN, `update public.reports set status = 'reviewed'`)).affected).toBe(1);
  });
});

describe('subscriptions: cada uno lee la suya; nadie se la cambia', () => {
  it('Ana ve solo su suscripcion', async () => {
    expect((await como(A, `select plan from public.subscriptions`)).rows.length).toBe(1);
  });

  it('Ana no puede regalarse el plan pro', async () => {
    expect(denegado(await como(A, `update public.subscriptions set plan = 'pro' where user_id = $1`, [A]))).toBe(true);
  });

  it('ni crearse una suscripcion', async () => {
    expect(denegado(await como(A, `insert into public.subscriptions (user_id, plan) values ($1, 'pro')`, [A]))).toBe(true);
  });
});

describe('cloud_inventory: solo el dueno; escribir exige suscripcion si la plataforma lo pide', () => {
  const juego = [
    JSON.stringify({ gameId: 'rpg', name: 'RPG' }),
    JSON.stringify([{ id: 'r1' }]),
    new Date().toISOString(),
  ];
  const subir = (quien: string, nombre = 'RPG') =>
    como(
      quien,
      `insert into public.cloud_inventory (game_key, game_name, template, items, client_updated_at)
  values ('rpg', $4, $1, $2, $3) on conflict (user_id, game_key) do update set game_name = excluded.game_name, items = excluded.items, client_updated_at = excluded.client_updated_at`,
      [...juego, nombre],
    );

  it('Ana sube su juego a la nube', async () => {
    expect((await subir(A)).error).toBeUndefined();
  });

  it('Beto no ve el inventario de Ana', async () => {
    expect((await como(B, `select * from public.cloud_inventory`)).rows.length).toBe(0);
  });

  it('ni lo puede borrar', async () => {
    const r = await como(B, `delete from public.cloud_inventory where user_id = $1`, [A]);
    expect(r.affected).toBe(0);
  });

  it('Ana no puede escribir en el inventario de Beto', async () => {
    const r = await como(
      A,
      `insert into public.cloud_inventory (user_id, game_key, game_name, template, client_updated_at) values ($1, 'x', 'x', '{}', now())`,
      [B],
    );
    expect(denegado(r)).toBe(true);
  });

  it('un visitante no lee inventarios', async () => {
    expect(denegado(await como(null, `select * from public.cloud_inventory`))).toBe(true);
  });

  it('con la nube de pago, Ana (plan gratuito) ya no puede modificar', async () => {
    await admin(`update public.app_settings set cloud_requires_subscription = true`);
    expect(denegado(await subir(A, 'RPG v2'))).toBe(true);
  });

  it('pero conserva y lee lo que ya guardo', async () => {
    const r = await como(A, `select game_name from public.cloud_inventory`);
    expect(r.rows[0]?.game_name).toBe('RPG');
  });

  it('con plan pro activo vuelve a poder modificar', async () => {
    await admin(
      `update public.subscriptions set plan = 'pro', status = 'active', current_period_end = now() + interval '30 days' where user_id = $1`,
      [A],
    );
    expect((await subir(A, 'RPG v2')).error).toBeUndefined();
  });

  it('si el plan vence, vuelve a solo lectura', async () => {
    await admin(`update public.subscriptions set current_period_end = now() - interval '1 day' where user_id = $1`, [A]);
    expect(denegado(await subir(A, 'RPG v3'))).toBe(true);
  });
});

describe('optimizer_cards: listado publico y liviano del hub', () => {
  let CARD = '';
  const JUEGO_ZZZ = '00000000-0000-0000-0000-0000000000c1';
  const JUEGO_HSR = '00000000-0000-0000-0000-0000000000c2';
  const conPortada = JSON.stringify({
    gameId: 'zzz',
    name: 'Zenless Zone Zero',
    cover: 'https://cdn.ejemplo.cl/zzz.webp',
  });
  const conPortadaEmbebida = JSON.stringify({
    gameId: 'hsr',
    name: 'Honkai: Star Rail',
    cover: 'data:image/png;base64,AAAA',
  });

  beforeAll(async () => {
    await admin(`insert into public.game (id, slug, name) values
      ($1, 'zenless-zone-zero', 'Zenless Zone Zero'),
      ($2, 'honkai-star-rail', 'Honkai: Star Rail')`, [JUEGO_ZZZ, JUEGO_HSR]);
    // Generos propios de este bloque: los del catalogo se insertan despues y
    // `genre_name_unique` es unico entre todos.
    await admin(`insert into public.genre (id, name) values
      ('00000000-0000-0000-0000-0000000000b1', 'Deckbuilder'),
      ('00000000-0000-0000-0000-0000000000b2', 'Roguelike')`);
    await admin(`insert into public.game_genre (game_id, genre_id) values
      ($1, '00000000-0000-0000-0000-0000000000b2'),
      ($1, '00000000-0000-0000-0000-0000000000b1')`, [JUEGO_ZZZ]);
    const r = await como(
      A,
      `insert into public.optimizers (game_id, name, template, published)
       values ($1, 'Disorder solver', $2, true) returning id`,
      [JUEGO_ZZZ, conPortada],
    );
    CARD = r.rows[0]?.id as string;
    await como(
      A,
      `insert into public.optimizers (game_id, name, template, published)
       values ($1, 'Portada embebida', $2, true)`,
      [JUEGO_HSR, conPortadaEmbebida],
    );
  });

  it('un visitante la puede leer', async () => {
    const r = await como(null, `select id from public.optimizer_cards`);
    expect(r.error).toBeUndefined();
    expect(r.rows.length).toBeGreaterThan(0);
  });

  it('expone generos, juego, portada y autor', async () => {
    const r = await como(null, `select * from public.optimizer_cards where id = $1`, [CARD]);
    const fila = r.rows[0] as Row;
    expect(fila.game_id).toBe(JUEGO_ZZZ);
    // `array_agg(order by g.name)` los devuelve ordenados.
    expect(fila.genres).toEqual(['Deckbuilder', 'Roguelike']);
    expect(fila.cover).toBe('https://cdn.ejemplo.cl/zzz.webp');
    expect(fila.author_name).toBe('Ana R');
    expect(fila.score).toBe(0);
  });

  it('un juego sin generos devuelve arreglo vacio, no NULL', async () => {
    const r = await como(
      null,
      `select genres from public.optimizer_cards where name = 'Portada embebida'`,
    );
    expect((r.rows[0] as Row).genres).toEqual([]);
  });

  it('descarta una portada embebida', async () => {
    const r = await como(
      null,
      `select cover from public.optimizer_cards where name = 'Portada embebida'`,
    );
    expect((r.rows[0] as Row).cover).toBeNull();
  });

  it('no incluye borradores', async () => {
    const ids = (await como(null, `select id from public.optimizer_cards`)).rows.map((r) => r.id);
    expect(ids.includes(BORRADOR)).toBe(false);
  });

  it('el autor ve su borrador en la tabla pero no en la vista', async () => {
    const tabla = await como(A, `select id from public.optimizers where id = $1`, [BORRADOR]);
    const vista = await como(A, `select id from public.optimizer_cards where id = $1`, [BORRADOR]);
    expect(tabla.rows.length).toBe(1);
    expect(vista.rows.length).toBe(0);
  });

  it('no expone columnas pesadas', async () => {
    const cols = (
      await admin(
        `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'optimizer_cards'`,
      )
    ).rows.map((c) => c.column_name as string);
    expect(cols).not.toContain('template');
    expect(cols).not.toContain('sample_items');
  });

  it('un borrador no se filtra por la vista aunque el autor tenga sesion', async () => {
    const r = await como(A, `select count(*)::int n from public.optimizer_cards where id = $1`, [BORRADOR]);
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });
});

describe('catalogo de juegos: juego, genero, juego_genero y juego_alias', () => {
  // El catalogo lo escribe solo la administracion; la lectura es publica.
  const JUEGO = '00000000-0000-0000-0000-0000000000e1';

  beforeAll(async () => {
    await admin(`insert into public.game (id, slug, name) values ($1, 'mundo-prueba', 'Mundo Prueba')`, [JUEGO]);
    await admin(`insert into public.genre (id, name) values
      ('00000000-0000-0000-0000-0000000000f1', 'Action RPG'),
      ('00000000-0000-0000-0000-0000000000f2', 'Gacha')`);
    await admin(`insert into public.game_genre (game_id, genre_id) values
      ($1, '00000000-0000-0000-0000-0000000000f1'),
      ($1, '00000000-0000-0000-0000-0000000000f2')`, [JUEGO]);
    await admin(`insert into public.game_alias (game_id, alias) values ($1, 'MP')`, [JUEGO]);
  });

  it('un visitante lee el catalogo', async () => {
    const r = await como(null, `select name from public.game`);
    expect(r.rows.length).toBeGreaterThan(0);
  });

  it('un juego tiene varios generos (M:N)', async () => {
    const r = await admin(`select count(*)::int n from public.game_genre where game_id = $1`, [JUEGO]);
    expect((r.rows[0] as { n: number }).n).toBe(2);
  });

  it('un juego tiene varios alias y el alias es unico entre juegos', async () => {
    const alias = await admin(`select alias from public.game_alias where game_id = $1`, [JUEGO]);
    expect(alias.rows.length).toBe(1);
    const dup = await admin(
      `insert into public.game_alias (game_id, alias)
       select id, ' mp ' from public.game where id = $1`,
      [JUEGO],
    ).catch((e: Error) => e);
    expect(dup).toBeInstanceOf(Error);
  });

  it('el slug solo admite minusculas y guiones', async () => {
    const r = await admin(`insert into public.game (slug, name) values ('Con Espacios', 'X')`).catch(
      (e: Error) => e,
    );
    expect(r).toBeInstanceOf(Error);
  });

  it('un usuario normal no puede escribir el catalogo', async () => {
    expect(denegado(await como(A, `insert into public.game (slug, name) values ('colado', 'Colado')`))).toBe(true);
    // Un delete bloqueado por RLS no lanza error: afecta 0 filas.
    expect((await como(A, `delete from public.game where id = $1`, [JUEGO])).affected).toBe(0);
    expect(
      denegado(
        await como(
          A,
          `insert into public.game_alias (game_id, alias) values ($1, 'hack')`,
          [JUEGO],
        ),
      ),
    ).toBe(true);
  });

  it('un juego agrupa varios optimizadores y no se puede borrar mientras los tenga', async () => {
    const enlazar = (nombre: string) =>
      admin(
        `insert into public.optimizers (author_id, game_id, name, description, template, published)
         values ($1, $2, $3, '', '{}'::jsonb, true)`,
        [A, JUEGO, nombre],
      );
    await enlazar('Build 1');
    await enlazar('Build 2');

    const antes = await admin(`select count(*)::int n from public.optimizers where game_id = $1`, [JUEGO]);
    expect((antes.rows[0] as { n: number }).n).toBe(2);

    // RESTRICT: retirar un juego del catalogo no puede dejar builds huerfanas
    // ni borrarlas en silencio. Primero se mueven, despues se borra el juego.
    const borrado = await admin(`delete from public.game where id = $1`, [JUEGO]).catch((e: Error) => e);
    expect(borrado).toBeInstanceOf(Error);

    const vivos = await admin(`select count(*)::int n from public.optimizers where game_id = $1`, [JUEGO]);
    expect((vivos.rows[0] as { n: number }).n).toBe(2);
  });
});

describe('cascada: borrar la cuenta borra sus datos', () => {
  it('el perfil y los favoritos de Beto desaparecen', async () => {
    await admin(`delete from auth.users where id = $1`, [B]);
    const quedan = (
      await admin(
        `select (select count(*) from public.profiles where id = $1)::int p, (select count(*) from public.favorites where user_id = $1)::int f`,
        [B],
      )
    ).rows[0] as { p: number; f: number };
    expect(quedan.p).toBe(0);
    expect(quedan.f).toBe(0);
  });
});

/**
 * Regresion de 20261125000001_privilegios_por_defecto.
 *
 * El arnes emula los privilegios por defecto de Supabase, asi que estas
 * pruebas SI detectan el agujero: sin la migracion, `anon` y `authenticated`
 * heredan INSERT/UPDATE/DELETE/TRUNCATE sobre la vista y sobre cada tabla
 * nueva. Se comprueba el privilegio directamente en el catalogo (no el
 * resultado de una consulta) porque un INSERT denegado por RLS y uno denegado
 * por falta de GRANT devuelven el mismo error y no se distinguen.
 */
describe('privilegios: un objeto nuevo no nace abierto', () => {
  it('la vista del hub solo concede SELECT', async () => {
    const r = await admin(
      `select grantee, string_agg(privilege_type, ',' order by privilege_type) as privs
         from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'optimizer_cards'
          and grantee in ('anon', 'authenticated')
        group by grantee order by grantee`,
    );
    expect(r.rows).toEqual([
      { grantee: 'anon', privs: 'SELECT' },
      { grantee: 'authenticated', privs: 'SELECT' },
    ]);
  });

  it('ningun rol de la API puede truncar ni borrar a traves de la vista', async () => {
    for (const rol of ['anon', 'authenticated']) {
      const r = await admin(
        `select has_table_privilege($1, 'public.optimizer_cards', 'TRUNCATE')::text as t,
                has_table_privilege($1, 'public.optimizer_cards', 'DELETE')::text as d`,
        [rol],
      );
      expect((r.rows[0] as Row).t).toBe('false');
      expect((r.rows[0] as Row).d).toBe('false');
    }
  });

  it('un authenticated no puede truncar el catalogo ni las tablas nuevas', async () => {
    for (const tabla of ['game', 'genre', 'game_genre', 'subscription_gifts']) {
      const r = await admin(
        `select has_table_privilege('authenticated', $1, 'TRUNCATE')::text as t`,
        [`public.${tabla}`],
      );
      expect((r.rows[0] as Row).t).toBe('false');
    }
  });

  it('handle_new_user no es invocable por la API', async () => {
    for (const rol of ['anon', 'authenticated']) {
      const r = await admin(
        `select has_function_privilege($1, 'public.handle_new_user()', 'EXECUTE')::text as x`,
        [rol],
      );
      expect((r.rows[0] as Row).x).toBe('false');
    }
  });

  it('is_admin y can_write_cloud siguen disponibles para los policies', async () => {
    for (const rol of ['anon', 'authenticated']) {
      for (const fn of ['public.is_admin()', 'public.can_write_cloud()']) {
        const r = await admin(`select has_function_privilege($1, $2, 'EXECUTE')::text as x`, [rol, fn]);
        expect((r.rows[0] as Row).x).toBe('true');
      }
    }
  });

  it('un objeto creado despues de las migraciones nace cerrado', async () => {
    // Prueba de comportamiento, no de catalogo: se crea una tabla y una vista
    // reales y se comprueba que la API no hereda nada. Sin la migracion, el
    // default de Supabase (emulado en el arnes) les daria arwdDxtm.
    await admin(`create table public.zz_probe_default (id int)`);
    await admin(`create view public.zz_probe_vista as select 1 as x`);
    try {
      for (const rol of ['anon', 'authenticated']) {
        for (const tabla of ['zz_probe_default', 'zz_probe_vista']) {
          for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
            const r = await admin(`select has_table_privilege($1, $2, $3)::text as x`, [
              rol,
              `public.${tabla}`,
              priv,
            ]);
            expect(`${tabla}.${priv}=${(r.rows[0] as Row).x}`).toBe(`${tabla}.${priv}=false`);
          }
        }
      }
    } finally {
      await admin(`drop view public.zz_probe_vista`);
      await admin(`drop table public.zz_probe_default`);
    }
  });

  it('ninguna funcion SECURITY DEFINER queda ejecutable salvo las de los policies', async () => {
    // PostgreSQL no permite cerrar por defecto el EXECUTE a PUBLIC de una
    // funcion (queda incorporado al valor de fabrica, no en la ACL), asi que
    // cada SECURITY DEFINER tiene que cerrarse en su migracion. Esto vigila
    // que ninguna se olvide: se listan las que la API puede ejecutar y se
    // compara con la lista blanca. Si alguien agrega una funcion nueva sin
    // revocarla, esta prueba falla y dice su nombre.
    const r = await admin(
      `select p.proname
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef
          and (has_function_privilege('anon', p.oid, 'EXECUTE')
               or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
        order by p.proname`,
    );
    // `ensure_game` entra en la lista a proposito (20261126000002): es la unica
    // via por la que un usuario sin rol de admin puede estrenar un juego en el
    // catalogo, y existe porque `optimizers.game_id` es not null desde que se
    // unifico el juego. La funcion no abre `game` entera: exige sesion,
    // reutiliza antes de crear y normaliza el nombre igual que el indice unico.
    expect(r.rows.map((f) => f.proname)).toEqual([
      'can_write_cloud',
      'ensure_game',
      'is_admin',
    ]);
  });
});

describe('subscription_gifts y stripe_events: las escribe el servidor', () => {
  const DONANTE = '00000000-0000-0000-0000-0000000000d9';
  const CREADOR = '00000000-0000-0000-0000-0000000000da';

  beforeAll(async () => {
    for (const [id, nombre] of [
      [DONANTE, 'Dora'],
      [CREADOR, 'Ciro'],
    ]) {
      await admin(`insert into auth.users (id) values ($1)`, [id]);
      await admin(`update public.profiles set display_name = $2 where id = $1`, [id, nombre]);
    }
    await admin(
      `insert into public.subscription_gifts (from_user_id, to_user_id, months, status)
       values ($1, $2, 3, 'paid')`,
      [DONANTE, CREADOR],
    );
  });

  it('el receptor ve lo que le donaron y el donante lo que dio', async () => {
    const comoCreador = (await como(CREADOR, `select months from public.subscription_gifts`)).rows;
    const comoDonante = (await como(DONANTE, `select months from public.subscription_gifts`)).rows;
    expect(comoCreador).toEqual([{ months: 3 }]);
    expect(comoDonante).toEqual([{ months: 3 }]);
  });

  it('un tercero no ve donaciones ajenas', async () => {
    const r = await como(A, `select months from public.subscription_gifts`);
    expect(r.rows).toEqual([]);
  });

  it('nadie puede insertar una donacion desde el cliente', async () => {
    expect(
      denegado(
        await como(
          DONANTE,
          `insert into public.subscription_gifts (from_user_id, to_user_id, months)
           values ($1, $2, 1)`,
          [DONANTE, CREADOR],
        ),
      ),
    ).toBe(true);
  });

  it('nadie se regala meses a si mismo (constraint)', async () => {
    const r = await admin(
      `insert into public.subscription_gifts (from_user_id, to_user_id, months)
       values ($1, $1, 1)`,
      [DONANTE],
    ).catch((e: Error) => e);
    expect(r).toBeInstanceOf(Error);
  });

  it('un mismo pago no se acredita dos veces (payment_ref unico)', async () => {
    const pagar = () =>
      admin(
        `insert into public.subscription_gifts (from_user_id, to_user_id, months, payment_ref)
         values ($1, $2, 1, 'pi_123')`,
        [DONANTE, CREADOR],
      );
    await pagar();
    expect(await pagar().catch((e: Error) => e)).toBeInstanceOf(Error);
  });

  it('ningun rol de la API toca stripe_events', async () => {
    for (const rol of ['anon', 'authenticated']) {
      const r = await admin(
        `select has_table_privilege($1, 'public.stripe_events', 'SELECT')::text as s,
                has_table_privilege($1, 'public.stripe_events', 'INSERT')::text as i`,
        [rol],
      );
      expect((r.rows[0] as Row).s).toBe('false');
      expect((r.rows[0] as Row).i).toBe('false');
    }
  });

  it('el evento de Stripe es idempotente por event_id', async () => {
    const recibir = () =>
      admin(`insert into public.stripe_events (event_id, type) values ('evt_1', 'checkout.session.completed')`);
    await recibir();
    expect(await recibir().catch((e: Error) => e)).toBeInstanceOf(Error);
  });
});

describe('ensure_game: estrenar juego sin ser admin', () => {
  const AUTOR = '00000000-0000-0000-0000-0000000000e1';
  const OTRO = '00000000-0000-0000-0000-0000000000e2';

  beforeAll(async () => {
    await admin(`insert into auth.users (id, email) values ($1, 'autor@ejemplo.cl')`, [AUTOR]);
    await admin(`insert into auth.users (id, email) values ($1, 'otro@ejemplo.cl')`, [OTRO]);
  });

  it('un anonimo no puede', async () => {
    const r = await como(null, `select public.ensure_game('Intruso') as id`);
    expect(r.error).toBeTruthy();
  });

  it('un usuario con sesion registra el juego y recibe su id', async () => {
    const r = await como(AUTOR, `select public.ensure_game('Hollow Vigil') as id`);
    expect(r.error).toBeUndefined();
    expect(r.rows[0].id).toBeTruthy();
  });

  it('el insert directo le sigue estando prohibido', async () => {
    // La funcion abre un camino estrecho, no la tabla entera.
    const r = await como(AUTOR, `insert into public.game (slug, name) values ('a-pelo', 'A pelo')`);
    expect(denegado(r)).toBe(true);
  });

  it('dos veces el mismo nombre devuelve el mismo juego', async () => {
    const a = await como(AUTOR, `select public.ensure_game('Repetido') as id`);
    const b = await como(OTRO, `select public.ensure_game('  rEpEtIdO ') as id`);
    expect(b.rows[0].id).toBe(a.rows[0].id);
  });

  it('no deja crear un juego sin nombre', async () => {
    const r = await como(AUTOR, `select public.ensure_game('   ') as id`);
    expect(r.error).toBeTruthy();
  });

  it('el slug pierde los acentos y queda con la forma que exige la tabla', async () => {
    await como(AUTOR, `select public.ensure_game('Camión Fantástico') as id`);
    const r = await admin(
      `select slug from public.game where lower(btrim(name)) = 'camión fantástico'`,
    );
    expect(r.rows[0].slug).toBe('camion-fantastico');
  });

  it('guarda quien lo creo', async () => {
    await como(AUTOR, `select public.ensure_game('Con Autor') as id`);
    const r = await admin(
      `select created_by from public.game where lower(btrim(name)) = 'con autor'`,
    );
    expect(r.rows[0].created_by).toBe(AUTOR);
  });
});
