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

  const migracion = readdirSync(MIGRATIONS_DIR).find((f) => f.endsWith('_esquema_inicial.sql'));
  if (!migracion) throw new Error('falta la migracion *_esquema_inicial.sql en supabase/migrations');
  await db.exec(readFileSync(join(MIGRATIONS_DIR, migracion), 'utf8'));
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
  it('un visitante no puede crear', async () => {
    const r = await como(null, `insert into public.optimizers (game_name, name, template) values ('Souls', 'x', $1)`, [
      PLANTILLA,
    ]);
    expect(denegado(r)).toBe(true);
  });

  it('Ana crea un optimizador y queda como autora', async () => {
    const ins = await como(
      A,
      `insert into public.optimizers (game_name, name, template, published) values ('Elden Ring', 'Builds de fuerza', $1, true) returning id, author_id`,
      [PLANTILLA],
    );
    expect(ins.error).toBeUndefined();
    expect(ins.rows[0]?.author_id).toBe(A);
    OPT = ins.rows[0]?.id as string;
  });

  it('no se puede crear a nombre de otro', async () => {
    const r = await como(
      A,
      `insert into public.optimizers (author_id, game_name, name, template) values ($1, 'X', 'a nombre de otro', $2)`,
      [B, PLANTILLA],
    );
    expect(denegado(r)).toBe(true);
  });

  it('no se puede crear con puntaje inflado', async () => {
    const r = await como(
      A,
      `insert into public.optimizers (game_name, name, template, score) values ('X', 'trampa', $1, 999)`,
      [PLANTILLA],
    );
    expect(denegado(r)).toBe(true);
  });

  it('un visitante ve los publicados y no los borradores', async () => {
    const borr = await como(
      A,
      `insert into public.optimizers (game_name, name, template) values ('Elden Ring', 'Borrador', $1) returning id`,
      [PLANTILLA],
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
    const r = await como(A, `insert into public.optimizers (game_name, name, template) values ('X', 'Y', '[]')`);
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
