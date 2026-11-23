-- =============================================================================
-- Unificar el nombre del juego: se elimina optimizers.game_name
-- =============================================================================
-- Deuda de la migracion 20261123000001: durante un tiempo el nombre del juego
-- vivio en dos lugares (`game_name` en texto libre y `game_id` al catalogo),
-- y eso permitia que un optimizador dijera "Astral Forge" apuntando a otro
-- juego. Ahora la unica fuente es `game`.
--
-- Orden (importante):
--   1. Todo optimizador con `game_name` pero sin `game_id` se enlaza a un
--      juego existente o se le crea uno. Asi no se pierde ni un dato.
--   2. Recien entonces `game_id` pasa a NOT NULL.
--   3. Se elimina `game_name` y su indice.
--
-- La vista `optimizer_cards` sigue exponiendo `game_name`, pero ahora derivado
-- del catalogo: la app no necesita cambiar y no puede desincronizarse.
--
-- Migracion append-only. La 20261123000001 no se toca.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill: cada optimizador queda enlazado a un juego
-- ---------------------------------------------------------------------------
-- Se compara sin distinguir mayusculas ni espacios, que es como el catalogo
-- evita duplicados. Lo que no exista se crea.
do $$
declare
  r record;
  target uuid;
  slug_base text;
  slug_final text;
  n int;
begin
  for r in
    select id, game_name
    from public.optimizers
    where game_id is null
  loop
    -- ¿Ya existe un juego con ese nombre?
    select g.id into target
    from public.game g
    where lower(btrim(g.name)) = lower(btrim(r.game_name))
    limit 1;

    if target is null then
      -- Slug a partir del nombre: minusculas, sin acentos, guiones.
      slug_base := lower(btrim(r.game_name));
      slug_base := translate(slug_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
      slug_base := regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g');
      slug_base := btrim(slug_base, '-');
      if slug_base = '' then slug_base := 'game'; end if;
      if char_length(slug_base) > 72 then slug_base := left(slug_base, 72); end if;

      -- Si el slug ya existe (dos nombres que colapsan igual), se sufija.
      slug_final := slug_base;
      n := 1;
      while exists (select 1 from public.game where slug = slug_final) loop
        n := n + 1;
        slug_final := slug_base || '-' || n::text;
      end loop;

      insert into public.game (slug, name)
      values (slug_final, left(btrim(r.game_name), 80))
      returning id into target;
    end if;

    update public.optimizers set game_id = target where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Ahora si, la relacion es obligatoria
-- ---------------------------------------------------------------------------
alter table public.optimizers alter column game_id set not null;

-- Con la columna obligatoria, `on delete set null` es incoherente: al borrar el
-- juego intentaria escribir null y violaria el not null. Lo que de verdad pasa
-- (y lo que se quiere) es negarse a borrar un juego que aun tiene builds:
-- RESTRICT. Para retirarlo hay que mover o borrar esos optimizadores antes.
alter table public.optimizers drop constraint optimizers_game_id_fkey;
alter table public.optimizers add constraint optimizers_game_id_fkey
  foreign key (game_id) references public.game (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 3. Eliminar la columna redundante
-- ---------------------------------------------------------------------------
-- La vista `optimizer_cards` lee `game_name`, asi que bloquea el drop hasta
-- que se suelta. Se recrea abajo con el mismo contrato.
drop view if exists public.optimizer_cards;

-- `optimizers_game_name_idx` solo existia para buscar por ese texto libre;
-- con la relacion, la busqueda va por `game_id` y `game.name`.
drop index if exists public.optimizers_game_name_idx;

alter table public.optimizers drop column game_name;

-- ---------------------------------------------------------------------------
-- 4. La vista expone el nombre desde el catalogo
-- ---------------------------------------------------------------------------
-- Mismo nombre de columna (`game_name`) y mismo orden que antes: la app y los
-- tipos no cambian, pero el valor ya no puede divergir del juego enlazado.
create view public.optimizer_cards
with (security_invoker = true) as
select
  o.id,
  o.name,
  o.description,
  g.name         as game_name,
  o.category,
  o.cover,
  o.score,
  o.votes_count,
  o.created_at,
  p.id           as author_id,
  p.display_name as author_name,
  p.avatar_url   as author_avatar
from public.optimizers o
join public.profiles p on p.id = o.author_id
join public.game g on g.id = o.game_id
where o.published;

-- El grant de la 003 muere con el drop: se vuelve a conceder.
grant select on public.optimizer_cards to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------------
-- Al eliminar una columna, PostgreSQL revoca por si solo el permiso de esa
-- columna y conserva los demas: no hay que re-conceder nada. `game_id` ya
-- se concedio en la 20261123000001, asi que el autor sigue pudiendo fijar el
-- juego de su optimizador.
