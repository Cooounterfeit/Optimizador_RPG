-- =============================================================================
-- Integridad y rendimiento (deuda del esquema)
-- =============================================================================
-- Solo estructura. NO toca RLS, permisos ni politicas: un cambio de seguridad
-- va en su propia migracion.
--
-- Migracion append-only: las 001..003 ya se aplicaron y no se editan.
--
-- Que cambia:
--   Integridad
--     1. reports: updated_at, reviewed_by y resolved_at (auditoria de moderacion).
--     2. reports.optimizer_id: on delete CASCADE -> SET NULL (no borrar la evidencia).
--     3. reports: se puede volver a reportar algo que se descarto.
--     4. cloud_inventory.state: tope de tamano, igual que template/items.
--   Rendimiento
--     5. El puntaje de los optimizadores se recalcula por sentencia, no por fila.
--     6. category y cover salen del jsonb a columnas generadas e indexables.
--     7. Faltaban indices para el admin (reports) y para el contador (favorites).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. reports: auditoria de moderacion
-- ---------------------------------------------------------------------------
-- Sin esto, un admin cambia el estado y no queda registro de cuando ni quien.
alter table public.reports
  add column updated_at  timestamptz not null default now(),
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column resolved_at timestamptz;

create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- El estado resuelto y su responsable se escriben solos al cambiar `status`.
-- No se conceden estas columnas al cliente: las pone el trigger.
create or replace function public.stamp_report_resolution() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('reviewed', 'dismissed') then
      new.resolved_at := now();
      new.reviewed_by := auth.uid();
    else
      new.resolved_at := null;
      new.reviewed_by := null;
    end if;
  end if;
  return new;
end $$;

create trigger reports_stamp_resolution before update on public.reports
  for each row execute function public.stamp_report_resolution();

-- ---------------------------------------------------------------------------
-- 2. reports: borrar un optimizador no borra sus reportes
-- ---------------------------------------------------------------------------
-- Con CASCADE, moderar un optimizador spam borraba la evidencia de todos los
-- reportes. Con SET NULL el reporte sobrevive y `optimizer_id` queda en null.
alter table public.reports alter column optimizer_id drop not null;

alter table public.reports drop constraint reports_optimizer_id_fkey;
alter table public.reports add constraint reports_optimizer_id_fkey
  foreign key (optimizer_id) references public.optimizers (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. reports: se puede volver a reportar lo que se descarto
-- ---------------------------------------------------------------------------
-- El unique original (reporter_id, optimizer_id) impedia reportar de nuevo un
-- contenido que un admin habia descartado. Ahora solo hay un reporte ACTIVO
-- por usuario y optimizador; los descartados no bloquean.
alter table public.reports drop constraint reports_reporter_id_optimizer_id_key;
create unique index reports_active_unique on public.reports (reporter_id, optimizer_id)
  where status <> 'dismissed';

-- ---------------------------------------------------------------------------
-- 4. cloud_inventory.state: tope de tamano
-- ---------------------------------------------------------------------------
-- template e items tienen tope de 5 MB; state no tenia ninguno.
alter table public.cloud_inventory add constraint cloud_inventory_state_size
  check (octet_length(state::text) <= 5000000);

-- ---------------------------------------------------------------------------
-- 5. Puntaje por sentencia en vez de por fila
-- ---------------------------------------------------------------------------
-- El trigger anterior era FOR EACH ROW: borrar un usuario con 50 votos
-- recalculaba 50 veces el mismo optimizador. Ahora se recalcula una vez por
-- sentencia, con las tablas de transicion.
drop trigger votes_score on public.votes;
drop function public.refresh_optimizer_score();

create or replace function public.refresh_optimizer_scores(opt_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.optimizers o set
    score       = coalesce((select sum(v.value) from public.votes v where v.optimizer_id = o.id), 0),
    votes_count = (select count(*)     from public.votes v where v.optimizer_id = o.id)
  where o.id = any(opt_ids);
$$;

create or replace function public.votes_score_ins_fn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_optimizer_scores(array(select distinct optimizer_id from new_votes));
  return null;
end $$;

create or replace function public.votes_score_upd_fn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_optimizer_scores(array(select distinct optimizer_id from new_votes));
  return null;
end $$;

create or replace function public.votes_score_del_fn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_optimizer_scores(array(select distinct optimizer_id from old_votes));
  return null;
end $$;

create trigger votes_score_ins after insert on public.votes
  referencing new table as new_votes
  for each statement execute function public.votes_score_ins_fn();

create trigger votes_score_upd after update on public.votes
  referencing new table as new_votes
  for each statement execute function public.votes_score_upd_fn();

create trigger votes_score_del after delete on public.votes
  referencing old table as old_votes
  for each statement execute function public.votes_score_del_fn();

-- PostgreSQL concede EXECUTE a PUBLIC en cada funcion nueva. Estas son
-- `security definer` (corren como owner y saltan RLS), asi que sin esto
-- cualquier visitante podria invocarlas por RPC. Nadie las llama desde el
-- cliente: las disparan los triggers.
revoke execute on function public.refresh_optimizer_scores(uuid[]) from public, anon, authenticated;
revoke execute on function public.votes_score_ins_fn() from public, anon, authenticated;
revoke execute on function public.votes_score_upd_fn() from public, anon, authenticated;
revoke execute on function public.votes_score_del_fn() from public, anon, authenticated;
revoke execute on function public.stamp_report_resolution() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. category y cover: del jsonb a columnas generadas
-- ---------------------------------------------------------------------------
-- La vista los extraia con ->> en cada lectura, sin poder indexarse. Como
-- columnas generadas se calculan al escribir y se pueden indexar y filtrar.
-- Las expresiones son inmutables (btrim, ->>, ~), requisito de una generada.
alter table public.optimizers
  add column category text generated always as (
    nullif(btrim(template ->> 'category'), '')
  ) stored,
  add column cover text generated always as (
    case when template ->> 'cover' ~ '^https?://' then template ->> 'cover' end
  ) stored;

create index optimizers_category_idx on public.optimizers (category)
  where category is not null;

-- La vista mantiene exactamente las mismas columnas y en el mismo orden.
create or replace view public.optimizer_cards
with (security_invoker = true) as
select
  o.id,
  o.name,
  o.description,
  o.game_name,
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
where o.published;

-- ---------------------------------------------------------------------------
-- 7. Indices que faltaban
-- ---------------------------------------------------------------------------
-- Bandeja de moderacion: "reportes abiertos, los mas viejos primero".
create index reports_status_created_idx on public.reports (status, created_at desc);

-- Contador de favoritos por optimizador (la PK cubre user_id, no optimizer_id).
create index favorites_optimizer_id_idx on public.favorites (optimizer_id);
