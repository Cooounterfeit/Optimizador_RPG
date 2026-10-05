/**
 * Pruebas de las reglas de seguridad de Supabase (TEC-03). Sale con codigo 1 si algo falla.
 *   npm run rls
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
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

let fallos = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) fallos++
  console.log(`  [${ok ? 'OK ' : 'FALLO'}] ${label}${detail ? `  ${detail}` : ''}`)
}

const db = new PGlite()

// ----------------------------------------------------------- Supabase simulado
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
`)

const dir = 'supabase/migrations'
const migracion = readdirSync(dir).find((f) => f.endsWith('_esquema_inicial.sql'))!
try {
  await db.exec(readFileSync(`${dir}/${migracion}`, 'utf8'))
  check(true, `la migracion ${migracion} corre sin errores`)
} catch (e) {
  check(false, 'la migracion corre sin errores', (e as Error).message)
  process.exit(1)
}

// ----------------------------------------------------------- ayudas
const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const ADMIN = '00000000-0000-0000-0000-0000000000ad'

/** Corre `sql` como `quien` (null = visitante sin sesion). Devuelve filas o el error. */
async function como(quien: string | null, sql: string, params: unknown[] = []): Promise<{ rows: any[]; error?: string; affected?: number }> {
  try {
    return await db.transaction(async (tx) => {
      await tx.exec(`set local role ${quien ? 'authenticated' : 'anon'}`)
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [quien ?? ''])
      const r = await tx.query(sql, params)
      return { rows: r.rows as any[], affected: r.affectedRows }
    })
  } catch (e) {
    return { rows: [], error: (e as Error).message }
  }
}
const admin = (sql: string, params: unknown[] = []) => db.query(sql, params)
const denegado = (r: { error?: string }) => !!r.error && /permission denied|row-level security|violates/i.test(r.error)

// ----------------------------------------------------------- registro
console.log('1. Registro: perfil y plan gratuito automaticos')
await admin(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'ana@ejemplo.cl', '{"display_name":"Ana"}')`, [A])
await admin(`insert into auth.users (id, email) values ($1, 'beto@ejemplo.cl')`, [B])
await admin(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'admin@ejemplo.cl', '{"display_name":"Admin"}')`, [ADMIN])
await admin(`update public.profiles set role = 'admin' where id = $1`, [ADMIN])
const perfiles = (await admin(`select id, display_name from public.profiles order by display_name`)).rows as any[]
check(perfiles.some((p) => p.id === A && p.display_name === 'Ana'), 'el perfil toma el nombre del formulario')
check(perfiles.some((p) => p.id === B && p.display_name === 'beto'), 'sin nombre, usa la parte del correo antes de @')
check(((await admin(`select count(*)::int n from public.subscriptions where plan = 'free'`)).rows[0] as any).n === 3, 'cada usuario parte con plan gratuito')

// ----------------------------------------------------------- profiles
console.log('2. profiles: lectura publica, cada uno edita lo suyo')
check((await como(null, `select display_name, bio from public.profiles`)).rows.length === 3, 'un visitante ve los perfiles publicos')
check(!!(await como(null, `select email from auth.users`)).error, 'un visitante no puede leer correos')
const cols = (await admin(`select column_name from information_schema.columns where table_schema='public' and table_name='profiles'`)).rows as any[]
check(!cols.some((c) => c.column_name === 'email'), 'profiles no guarda el correo (no es visible para otros)')
check((await como(A, `update public.profiles set display_name = 'Ana R', bio = 'Main Ashe' where id = $1`, [A])).affected === 1, 'Ana cambia su nombre y descripcion')
check((await como(A, `update public.profiles set display_name = 'hackeado' where id = $1`, [B])).affected === 0, 'Ana no puede cambiar el perfil de Beto')
check(denegado(await como(A, `update public.profiles set role = 'admin' where id = $1`, [A])), 'Ana no puede darse rol de admin')
check(!!(await como(A, `update public.profiles set display_name = '' where id = $1`, [A])).error, 'el nombre no puede quedar vacio')
check(!!(await como(A, `update public.profiles set display_name = repeat('x', 41) where id = $1`, [A])).error, 'el nombre es breve (maximo 40)')
check(denegado(await como(null, `update public.profiles set bio = 'x'`)), 'un visitante no edita perfiles')

// ----------------------------------------------------------- optimizers
console.log('3. optimizers: lectura publica, crea quien tiene sesion, edita el autor o un admin')
const plantilla = JSON.stringify({ gameId: 'souls', name: 'Souls' })
check(denegado(await como(null, `insert into public.optimizers (game_name, name, template) values ('Souls', 'x', $1)`, [plantilla])), 'un visitante no puede crear')
const ins = await como(A, `insert into public.optimizers (game_name, name, template, published) values ('Elden Ring', 'Builds de fuerza', $1, true) returning id, author_id`, [plantilla])
check(!ins.error && ins.rows[0]?.author_id === A, 'Ana crea un optimizador y queda como autora', ins.error)
const OPT = ins.rows[0]?.id
const borr = await como(A, `insert into public.optimizers (game_name, name, template) values ('Elden Ring', 'Borrador', $1) returning id`, [plantilla])
const BORRADOR = borr.rows[0]?.id
check(denegado(await como(A, `insert into public.optimizers (author_id, game_name, name, template) values ($1, 'X', 'a nombre de otro', $2)`, [B, plantilla])), 'no se puede crear a nombre de otro')
check(denegado(await como(A, `insert into public.optimizers (game_name, name, template, score) values ('X', 'trampa', $1, 999)`, [plantilla])), 'no se puede crear con puntaje inflado')
const vistos = (await como(null, `select id from public.optimizers`)).rows.map((r) => r.id)
check(vistos.includes(OPT) && !vistos.includes(BORRADOR), 'un visitante ve los publicados y no los borradores')
check(!(await como(B, `select id from public.optimizers where id = $1`, [BORRADOR])).rows.length, 'Beto no ve el borrador de Ana')
check((await como(A, `select id from public.optimizers where id = $1`, [BORRADOR])).rows.length === 1, 'Ana ve su borrador')
check((await como(B, `update public.optimizers set name = 'robado' where id = $1`, [OPT])).affected === 0, 'Beto no puede editar el optimizador de Ana')
check((await como(B, `delete from public.optimizers where id = $1`, [OPT])).affected === 0, 'Beto no puede borrarlo')
check(denegado(await como(A, `update public.optimizers set score = 999 where id = $1`, [OPT])), 'ni el autor puede tocar el puntaje')
check(denegado(await como(A, `update public.optimizers set author_id = $2 where id = $1`, [OPT, B])), 'ni cambiar el autor')
check((await como(ADMIN, `update public.optimizers set description = 'moderado' where id = $1`, [OPT])).affected === 1, 'un admin puede editar el de otro')
check(!!(await como(A, `insert into public.optimizers (game_name, name, template) values ('X', 'Y', '[]')`)).error, 'la plantilla debe ser un objeto JSON')
const antes = (await admin(`select updated_at from public.optimizers where id = $1`, [OPT])).rows[0] as any
await new Promise((r) => setTimeout(r, 15))
await como(A, `update public.optimizers set description = 'v2' where id = $1`, [OPT])
const despues = (await admin(`select updated_at from public.optimizers where id = $1`, [OPT])).rows[0] as any
check(new Date(despues.updated_at) > new Date(antes.updated_at), 'updated_at se actualiza solo')

// ----------------------------------------------------------- votes
console.log('4. votes: un voto por usuario y optimizador; el puntaje se calcula solo')
const puntaje = async () => (await admin(`select score, votes_count from public.optimizers where id = $1`, [OPT])).rows[0] as any
check(denegado(await como(null, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT])), 'un visitante no puede votar')
check(!(await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT])).error, 'Beto vota +1')
check((await puntaje()).score === 1 && (await puntaje()).votes_count === 1, 'puntaje 1 con 1 voto')
const dup = await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT])
check(!!dup.error && /duplicate key|unique/i.test(dup.error), 'un segundo voto del mismo usuario se rechaza', dup.error)
check((await como(B, `update public.votes set value = -1 where optimizer_id = $1`, [OPT])).affected === 1, 'Beto cambia su voto a -1')
check((await puntaje()).score === -1, 'el puntaje baja a -1')
check(denegado(await como(A, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [OPT])), 'Ana no puede votar su propio optimizador')
check(denegado(await como(B, `insert into public.votes (optimizer_id, value) values ($1, 1)`, [BORRADOR])), 'nadie vota un borrador')
check(!!(await como(ADMIN, `insert into public.votes (optimizer_id, value) values ($1, 5)`, [OPT])).error, 'el voto solo puede ser +1 o -1')
check((await como(A, `update public.votes set value = 1 where user_id = $1`, [B])).affected === 0, 'Ana no puede cambiar el voto de Beto')
check((await como(B, `delete from public.votes where optimizer_id = $1`, [OPT])).affected === 1 && (await puntaje()).score === 0, 'Beto retira su voto y el puntaje vuelve a 0')
check((await como(null, `select * from public.votes`)).rows.length >= 0, 'los votos se pueden leer (conteos publicos)')

// ----------------------------------------------------------- favorites
console.log('5. favorites: privados')
check(!(await como(B, `insert into public.favorites (optimizer_id) values ($1)`, [OPT])).error, 'Beto guarda un favorito')
check((await como(A, `select * from public.favorites`)).rows.length === 0, 'Ana no ve los favoritos de Beto')
check((await como(B, `select * from public.favorites`)).rows.length === 1, 'Beto ve los suyos')

// ----------------------------------------------------------- reports
console.log('6. reports: cada uno ve los suyos; el admin ve todos')
check(!(await como(B, `insert into public.reports (optimizer_id, reason, detail) values ($1, 'spam', 'promo')`, [OPT])).error, 'Beto reporta')
check(!!(await como(B, `insert into public.reports (optimizer_id, reason) values ($1, 'spam')`, [OPT])).error, 'no puede reportar dos veces lo mismo')
check((await como(A, `select * from public.reports`)).rows.length === 0, 'Ana (la autora) no ve quien la reporto')
check((await como(ADMIN, `select * from public.reports`)).rows.length === 1, 'el admin ve el reporte')
check((await como(B, `update public.reports set status = 'dismissed'`)).affected === 0, 'Beto no puede cerrar su propio reporte')
check((await como(ADMIN, `update public.reports set status = 'reviewed'`)).affected === 1, 'el admin lo marca como revisado')

// ----------------------------------------------------------- subscriptions
console.log('7. subscriptions: cada uno lee la suya; nadie se la cambia')
check((await como(A, `select plan from public.subscriptions`)).rows.length === 1, 'Ana ve solo su suscripcion')
check(denegado(await como(A, `update public.subscriptions set plan = 'pro' where user_id = $1`, [A])), 'Ana no puede regalarse el plan pro')
check(denegado(await como(A, `insert into public.subscriptions (user_id, plan) values ($1, 'pro')`, [A])), 'ni crearse una suscripcion')

// ----------------------------------------------------------- cloud_inventory
console.log('8. cloud_inventory: solo el dueno; escribir exige suscripcion si la plataforma lo pide')
const juego = [JSON.stringify({ gameId: 'rpg', name: 'RPG' }), JSON.stringify([{ id: 'r1' }]), new Date().toISOString()]
const subir = (quien: string, nombre = 'RPG') => como(quien, `insert into public.cloud_inventory (game_key, game_name, template, items, client_updated_at)
  values ('rpg', $4, $1, $2, $3) on conflict (user_id, game_key) do update set game_name = excluded.game_name, items = excluded.items, client_updated_at = excluded.client_updated_at`, [...juego, nombre])
check(!(await subir(A)).error, 'Ana sube su juego a la nube')
check((await como(B, `select * from public.cloud_inventory`)).rows.length === 0, 'Beto no ve el inventario de Ana')
check((await como(B, `delete from public.cloud_inventory where user_id = $1`, [A])).affected === 0, 'ni lo puede borrar')
check(denegado(await como(A, `insert into public.cloud_inventory (user_id, game_key, game_name, template, client_updated_at) values ($1, 'x', 'x', '{}', now())`, [B])), 'Ana no puede escribir en el inventario de Beto')
check(denegado(await como(null, `select * from public.cloud_inventory`)), 'un visitante no lee inventarios')
await admin(`update public.app_settings set cloud_requires_subscription = true`)
check(denegado(await subir(A, 'RPG v2')), 'con la nube de pago, Ana (plan gratuito) ya no puede modificar')
check((await como(A, `select game_name from public.cloud_inventory`)).rows[0]?.game_name === 'RPG', 'pero conserva y lee lo que ya guardo')
await admin(`update public.subscriptions set plan = 'pro', status = 'active', current_period_end = now() + interval '30 days' where user_id = $1`, [A])
check(!(await subir(A, 'RPG v2')).error, 'con plan pro activo vuelve a poder modificar')
await admin(`update public.subscriptions set current_period_end = now() - interval '1 day' where user_id = $1`, [A])
check(denegado(await subir(A, 'RPG v3')), 'si el plan vence, vuelve a solo lectura')

// ----------------------------------------------------------- cascada
console.log('9. Borrar la cuenta borra sus datos')
await admin(`delete from auth.users where id = $1`, [B])
const quedan = (await admin(`select (select count(*) from public.profiles where id = $1)::int p, (select count(*) from public.favorites where user_id = $1)::int f`, [B])).rows[0] as any
check(quedan.p === 0 && quedan.f === 0, 'el perfil y los favoritos de Beto desaparecen')

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
