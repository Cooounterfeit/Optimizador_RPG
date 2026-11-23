-- =============================================================================
-- Privilegios por defecto: que un objeto nuevo no nazca abierto
-- =============================================================================
-- Origen del problema (verificado en la base local):
--
--   pg_default_acl tiene, para `postgres` en `public`:
--     r: postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm
--     f: postgres=X,         anon=X,          authenticated=X,          service_role=X
--
-- Es decir: todo `create table` / `create view` posterior a las migraciones
-- nace con INSERT/UPDATE/DELETE/TRUNCATE para `anon` y `authenticated`. La RLS
-- sigue protegiendo las filas, pero TRUNCATE no pasa por RLS — un
-- `authenticated` cualquiera podria vaciar una tabla nueva. Y una vista
-- `security_invoker` nueva quedaba con permisos de escritura que nunca se
-- pidieron. Las funciones nacen con EXECUTE para PUBLIC (ver seccion 1).
--
-- Las migraciones anteriores ya hacen `revoke all` *tabla por tabla*. Eso
-- funciona, pero solo si alguien se acuerda de escribirlo cada vez. Esta
-- migracion corrige la causa: cambia el privilegio POR DEFECTO. Las dos capas
-- se complementan:
--
--   * el default cubre lo que se cree de ahora en adelante;
--   * los `revoke` explicitos siguen cubriendo lo que ya existe.
--
-- ALTER DEFAULT PRIVILEGES no es retroactivo: no toca los objetos ya creados.
-- Por eso la seccion 2 arregla los dos objetos que quedaron abiertos.
--
-- IMPORTANTE para futuras migraciones: a partir de aca, un objeto nuevo NO es
-- alcanzable por PostgREST hasta que se le conceda algo a proposito. Si un
-- policy llama a una funcion, esa funcion necesita EXECUTE para el rol que
-- ejecuta la consulta (el policy se evalua como quien consulta; verificado:
-- revocar EXECUTE da "permission denied for function" al consultar). Los
-- triggers son la excepcion: se disparan sin comprobar EXECUTE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cambiar el default
-- ---------------------------------------------------------------------------
-- `postgres` es el rol que aplica las migraciones y el dueno de las tablas de
-- `public`, asi que su entrada de pg_default_acl es la que importa.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

-- Las funciones son el caso raro, y conviene decirlo claro porque parece que
-- funciona y no funciona: PostgreSQL tiene EXECUTE para PUBLIC *incorporado*
-- en el valor por defecto de una funcion, no guardado en la ACL. Al revocarlo
-- por defecto, el ACL resultante coincide con el de fabrica y PostgreSQL
-- descarta la fila como redundante; la funcion nueva vuelve a traer `=X`.
-- Comprobado en esta misma base: tras el revoke, `proacl` de una funcion nueva
-- sigue siendo `=X/postgres` y `has_function_privilege('anon', ..., 'EXECUTE')`
-- devuelve true.
--
-- Se revoca igual lo que SI esta guardado (el grant explicito a anon y
-- authenticated que agrego Supabase), como defensa en profundidad, pero la
-- conclusion practica es otra: **un EXECUTE a PUBLIC no se puede cerrar por
-- defecto**. Cada funcion SECURITY DEFINER nueva tiene que cerrarse en su
-- propia migracion, como se hace en la seccion 2. Hay una prueba que vigila
-- esa invariante (ver rls.spec.ts, "ninguna funcion SECURITY DEFINER...").
alter default privileges in schema public
  revoke all on functions from anon, authenticated;

-- `supabase_admin` tiene SU PROPIA entrada en pg_default_acl y crea objetos
-- cuando se usa el SQL Editor del panel. No se puede tocar desde una migracion
-- en todos los entornos: `postgres` no es miembro de ese rol en la base local
-- y el ALTER falla con "permission denied to change default privileges". Se
-- intenta solo si el rol existe y el usuario actual es miembro; si no, se omite
-- sin romper el reset.
do $bloque$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    if pg_has_role(current_user, 'supabase_admin', 'MEMBER') then
      execute 'alter default privileges for role supabase_admin in schema public
                 revoke all on tables from anon, authenticated';
      execute 'alter default privileges for role supabase_admin in schema public
                 revoke all on sequences from anon, authenticated';
      execute 'alter default privileges for role supabase_admin in schema public
                 revoke all on functions from anon, authenticated';
    end if;
  end if;
end
$bloque$;

-- ---------------------------------------------------------------------------
-- 2. Los dos objetos que quedaron abiertos
-- ---------------------------------------------------------------------------

-- 2.1 La vista del hub. Se creo en la 003 con `grant select`, pero el default
-- le habia dado ademas INSERT/UPDATE/DELETE/TRUNCATE a anon y a authenticated.
-- Hoy no es explotable porque la vista tiene joins y no es auto-actualizable
-- (INSERT/UPDATE fallan con "cannot insert into view"), pero DELETE y
-- TRUNCATE no dependen de eso y el permiso no deberia estar. Se parte de cero.
revoke all on public.optimizer_cards from anon, authenticated;
grant select on public.optimizer_cards to anon, authenticated;

-- 2.2 `handle_new_user` es SECURITY DEFINER y tenia EXECUTE para PUBLIC, anon y
-- authenticated. Al ser RETURNS trigger no se puede invocar por PostgREST, asi
-- que tampoco es explotable, pero un SECURITY DEFINER solo debe estar al
-- alcance de quien lo necesita: el trigger. El trigger sigue disparando sin
-- EXECUTE (verificado).
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 2.3 Mismo caso con `set_updated_at`: no es SECURITY DEFINER, pero es un
-- trigger y no tiene por que ser invocable. `stamp_report_resolution` y
-- `votes_score_*` ya estaban cerradas.
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- 2.4 `is_admin` y `can_write_cloud` SI deben quedar alcanzables: los policies
-- las invocan con el rol del que consulta. Se cierra el grant implicito a
-- PUBLIC y se concede explicitamente a los dos roles de la API.
revoke all on function public.is_admin() from public;
revoke all on function public.can_write_cloud() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_write_cloud() to anon, authenticated;
