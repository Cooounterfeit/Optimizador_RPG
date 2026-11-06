-- =============================================================================
-- F5: tarjetas del catalogo para el hub.
--
-- El hub necesita solo campos livianos; `template` y `sample_items` pueden
-- pesar hasta 5 MB por fila. Esta vista los deja fuera y expone la categoria y
-- la portada como escalares.
--
-- `security_invoker = true` hace que la vista corra con los permisos de quien
-- consulta, asi que las politicas RLS de `optimizers` y `profiles` siguen
-- aplicando. El `where published` la deja como listado publico: los borradores
-- se leen de la tabla cuando exista la pantalla de creacion.
-- =============================================================================

create or replace view public.optimizer_cards
with (security_invoker = true) as
select
  o.id,
  o.name,
  o.description,
  o.game_name,
  nullif(btrim(o.template ->> 'category'), '') as category,
  case
    when o.template ->> 'cover' ~ '^https?://' then o.template ->> 'cover'
  end as cover,
  o.score,
  o.votes_count,
  o.created_at,
  p.id           as author_id,
  p.display_name as author_name,
  p.avatar_url   as author_avatar
from public.optimizers o
join public.profiles p on p.id = o.author_id
where o.published;

grant select on public.optimizer_cards to anon, authenticated;
