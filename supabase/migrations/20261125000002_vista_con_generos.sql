-- =============================================================================
-- La vista del hub expone generos del catalogo y deja de exponer `category`
-- =============================================================================
-- Decision de producto: `category` desaparece. El genero de un juego ya vive
-- en el catalogo normalizado (`genre` + `game_genre`), que es M:N y por
-- tanto puede describir un juego con varios generos. Una columna de texto
-- libre copiada del JSON del autor no puede hacer eso, y ademas admitia
-- deriva: el mismo juego podia aparecer como "ARPG" en un optimizador y como
-- "Action RPG" en otro (los fixtures de la app ya mostraban las dos formas).
--
-- Se eliminan las tres piezas que sostenian `category`:
--   1. la columna generada `optimizers.category` (salida de template->>'category')
--   2. su indice parcial
--   3. la columna en la vista `optimizer_cards`
--
-- `cover` se queda: una portada si es un dato de presentacion del optimizador,
-- no una clasificacion del juego.
-- =============================================================================

-- La vista lee `o.category`, asi que bloquea el drop hasta que se suelta.
drop view if exists public.optimizer_cards;

-- `optimizers_category_idx` era un indice parcial sobre la columna generada
-- (`where category is not null`); sin columna no tiene sentido.
drop index if exists public.optimizers_category_idx;

alter table public.optimizers drop column if exists category;

-- ---------------------------------------------------------------------------
-- La vista, ahora con `game_id` y el arreglo de generos
-- ---------------------------------------------------------------------------
-- Los generos se resuelven con un subselect correlacionado en vez de un
-- join + GROUP BY: la vista ya tiene un join con `game` y agregar otro habria
-- obligado a agrupar por las doce columnas. Asi cada fila trae su arreglo y el
-- resto de la forma no cambia.
--
-- `coalesce(..., '{}')`: un juego sin generos asignados devuelve arreglo vacio,
-- no NULL, para que el cliente no tenga que distinguir los dos casos.
create view public.optimizer_cards
with (security_invoker = true) as
select
  o.id,
  o.name,
  o.description,
  o.game_id,
  g.name         as game_name,
  coalesce(
    (
      select array_agg(ge.name order by ge.name)
        from public.game_genre gg
        join public.genre ge on ge.id = gg.genre_id
       where gg.game_id = o.game_id
    ),
    '{}'::text[]
  )              as genres,
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

-- El grant de la vista anterior muere con el drop. Se parte de cero para que
-- no herede nada del default: solo lectura publica.
revoke all on public.optimizer_cards from anon, authenticated;
grant select on public.optimizer_cards to anon, authenticated;
