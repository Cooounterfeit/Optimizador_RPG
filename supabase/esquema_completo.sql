-- =============================================================================
-- Zenith Optimizer - esquema completo para un proyecto Supabase nuevo
-- =============================================================================
-- ARCHIVO GENERADO. No editar a mano.
-- Fuente de verdad: supabase/migrations/*.sql (una migracion aplicada no se edita;
-- un cambio es un archivo nuevo). Este archivo es solo una copia pegable.
--
-- Contenido, en orden:
--   * 20261005000001_esquema_inicial.sql
--   * 20261005000002_avatares.sql
--   * 20261005000003_optimizer_cards.sql
--   * 20261122000001_integridad_rendimiento.sql
--   * 20261123000001_catalogo_juegos.sql
--   * 20261124000001_unificar_juego.sql
--   * 20261125000001_privilegios_por_defecto.sql
--   * 20261125000002_vista_con_generos.sql
--   * 20261125000003_gifts_y_stripe_events.sql
--
-- Pegar completo en el SQL Editor de Supabase y ejecutar UNA sola vez.
-- Ejecutarlo dos veces falla en los "create table": eso es esperable.
-- =============================================================================

-- ===== 20261005000001_esquema_inicial.sql =====
-- =============================================================================
-- Zenith Optimizer Â· esquema inicial (TEC-02) y reglas de seguridad (TEC-03)
-- =============================================================================
-- Principios:
--   * Cada juego viaja como UN documento jsonb (el mismo .zenith.json que la app
--     exporta). Asi el modelo de juego puede seguir cambiando (niveles, arboles,
--     curvas) sin migrar tablas. Solo se normaliza lo que se consulta o se
--     cuenta: usuarios, votos, favoritos, reportes, suscripciones.
--   * RLS en todas las tablas. Los permisos de columna impiden que un usuario
--     se ponga rol de admin, se suba el puntaje o se regale una suscripcion.
--   * El correo vive solo en auth.users: nadie mas lo ve (AUT-3).
--
-- Se ejecuta tal cual en el SQL Editor de Supabase, o con `supabase db push`.
-- Las pruebas de politicas estan en supabase/tests/rls.spec.ts (nx test supabase).
-- =============================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13: no hace falta pgcrypto.

-- ----------------------------------------------------------------- utilidades

-- created_at / updated_at automaticos (TEC-02).
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ----------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url   text check (avatar_url is null or char_length(avatar_url) <= 500),
  bio          text not null default '' check (char_length(bio) <= 280),
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Â¿El usuario de la peticion es administrador? (security definer: lee profiles
-- sin pasar por RLS, y no se puede usar para escalar porque solo responde).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ----------------------------------------------------------------- subscriptions

create table if not exists public.subscriptions (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  plan               text not null default 'free' check (plan in ('free', 'pro')),
  status             text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Ajustes de la plataforma (una sola fila). Mientras no exista Stripe, la copia
-- en la nube no exige suscripcion; al integrar pagos se pone en true.
create table if not exists public.app_settings (
  id                          boolean primary key default true check (id),
  cloud_requires_subscription boolean not null default false
);
insert into public.app_settings default values;

-- Â¿Puede el usuario escribir en su inventario en la nube? (INV-8: si deja de
-- ser suscriptor conserva lo guardado pero no puede modificarlo).
create or replace function public.can_write_cloud() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    not (select cloud_requires_subscription from public.app_settings)
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid() and s.plan = 'pro' and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
  )
$$;

-- Al registrarse: perfil con el nombre del formulario y plan gratuito.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nombre text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if nombre = '' then nombre := split_part(coalesce(new.email, 'jugador'), '@', 1); end if;
  insert into public.profiles (id, display_name) values (new.id, left(nombre, 40));
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- optimizers

-- Un optimizador comunitario: la plantilla del juego (jsonb) y objetos de muestra.
create table if not exists public.optimizers (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_name    text not null check (char_length(btrim(game_name)) between 1 and 80),
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  description  text not null default '' check (char_length(description) <= 2000),
  template     jsonb not null check (jsonb_typeof(template) = 'object' and octet_length(template::text) <= 5000000),
  sample_items jsonb not null default '[]' check (jsonb_typeof(sample_items) = 'array' and octet_length(sample_items::text) <= 5000000),
  published    boolean not null default false,
  forked_from  uuid references public.optimizers (id) on delete set null,
  score        integer not null default 0,
  votes_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger optimizers_updated_at before update on public.optimizers
  for each row execute function public.set_updated_at();
create index optimizers_game_name_idx on public.optimizers (lower(game_name));
create index optimizers_author_idx on public.optimizers (author_id);
create index optimizers_ranking_idx on public.optimizers (published, score desc, created_at desc);

-- ----------------------------------------------------------------- votes

create table if not exists public.votes (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  optimizer_id uuid not null references public.optimizers (id) on delete cascade,
  value        smallint not null check (value in (-1, 1)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, optimizer_id)          -- un voto por usuario y optimizador
);
create trigger votes_updated_at before update on public.votes
  for each row execute function public.set_updated_at();
create index votes_user_id_idx on public.votes (user_id);
create index votes_optimizer_id_idx on public.votes (optimizer_id);

-- Puntaje y cantidad de votos se recalculan solos; nadie los escribe a mano.
create or replace function public.refresh_optimizer_score() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  oid uuid := coalesce(new.optimizer_id, old.optimizer_id);
begin
  update public.optimizers o set
    score = coalesce((select sum(value) from public.votes v where v.optimizer_id = oid), 0),
    votes_count = (select count(*) from public.votes v where v.optimizer_id = oid)
  where o.id = oid;
  return null;
end $$;
create trigger votes_score after insert or update or delete on public.votes
  for each row execute function public.refresh_optimizer_score();

-- ----------------------------------------------------------------- favorites

create table if not exists public.favorites (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  optimizer_id uuid not null references public.optimizers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, optimizer_id)
);

-- ----------------------------------------------------------------- reports

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  optimizer_id uuid not null references public.optimizers (id) on delete cascade,
  reason       text not null check (reason in ('contenido_inapropiado', 'spam', 'datos_falsos', 'copia', 'otro')),
  detail       text not null default '' check (char_length(detail) <= 1000),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at   timestamptz not null default now(),
  unique (reporter_id, optimizer_id)
);

-- ----------------------------------------------------------------- cloud_inventory

-- "Mis juegos" en la nube (INV-8): el paquete del juego (plantilla + objetos) y
-- el estado del personaje (equipo, habilidades, historial de niveles), por usuario.
create table if not exists public.cloud_inventory (
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_key          text not null check (char_length(game_key) between 1 and 120),
  game_name         text not null check (char_length(btrim(game_name)) between 1 and 80),
  template          jsonb not null check (jsonb_typeof(template) = 'object' and octet_length(template::text) <= 5000000),
  items             jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and octet_length(items::text) <= 5000000),
  state             jsonb not null default '{}' check (jsonb_typeof(state) = 'object'),
  forked_from       text,
  client_updated_at timestamptz not null,          -- cuando cambio en el dispositivo (para los conflictos)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, game_key)
);
create trigger cloud_inventory_updated_at before update on public.cloud_inventory
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Permisos y RLS
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.app_settings    enable row level security;
alter table public.optimizers      enable row level security;
alter table public.votes           enable row level security;
alter table public.favorites       enable row level security;
alter table public.reports         enable row level security;
alter table public.cloud_inventory enable row level security;

-- Supabase da todo a anon/authenticated por defecto: se parte de cero y se
-- concede solo lo necesario, columna por columna donde importa.
revoke all on public.profiles, public.subscriptions, public.app_settings, public.optimizers,
  public.votes, public.favorites, public.reports, public.cloud_inventory from anon, authenticated;

-- profiles: lectura publica; cada uno edita su nombre, foto y descripcion (no su rol).
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- subscriptions: cada uno ve la suya. Solo el servidor (Stripe, service role) escribe.
grant select on public.subscriptions to authenticated;
create policy subscriptions_select_own on public.subscriptions for select using (user_id = auth.uid());

-- app_settings: lectura publica (la app sabe si la nube exige suscripcion).
grant select on public.app_settings to anon, authenticated;
create policy app_settings_select on public.app_settings for select using (true);

-- optimizers: se ven los publicados (y los propios); crea cualquier usuario con
-- sesion; edita o borra el autor o un admin. El puntaje no se toca a mano.
grant select on public.optimizers to anon, authenticated;
grant insert (game_name, name, description, template, sample_items, published, forked_from) on public.optimizers to authenticated;
grant update (game_name, name, description, template, sample_items, published) on public.optimizers to authenticated;
grant delete on public.optimizers to authenticated;
create policy optimizers_select on public.optimizers for select
  using (published or author_id = auth.uid() or public.is_admin());
create policy optimizers_insert on public.optimizers for insert to authenticated
  with check (author_id = auth.uid());
create policy optimizers_update on public.optimizers for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy optimizers_delete on public.optimizers for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- votes: lectura publica; un voto propio por optimizador publicado, y no al propio.
grant select on public.votes to anon, authenticated;
grant insert (optimizer_id, value) on public.votes to authenticated;
grant update (value) on public.votes to authenticated;
grant delete on public.votes to authenticated;
create policy votes_select on public.votes for select using (true);
create policy votes_insert on public.votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.optimizers o where o.id = optimizer_id and o.published and o.author_id <> auth.uid())
  );
create policy votes_update on public.votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy votes_delete on public.votes for delete to authenticated using (user_id = auth.uid());

-- favorites: privados.
grant select, delete on public.favorites to authenticated;
grant insert (optimizer_id) on public.favorites to authenticated;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: cada uno crea y ve los suyos; los admins ven y resuelven todos.
grant select on public.reports to authenticated;
grant insert (optimizer_id, reason, detail) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- cloud_inventory: solo el dueno. Leer siempre; escribir si can_write_cloud().
grant select, delete on public.cloud_inventory to authenticated;
grant insert (game_key, game_name, template, items, state, forked_from, client_updated_at) on public.cloud_inventory to authenticated;
grant update (game_name, template, items, state, forked_from, client_updated_at) on public.cloud_inventory to authenticated;
create policy cloud_select_own on public.cloud_inventory for select to authenticated using (user_id = auth.uid());
create policy cloud_insert_own on public.cloud_inventory for insert to authenticated
  with check (user_id = auth.uid() and public.can_write_cloud());
create policy cloud_update_own on public.cloud_inventory for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_write_cloud());
create policy cloud_delete_own on public.cloud_inventory for delete to authenticated using (user_id = auth.uid());

-- Los cambios de cloud_inventory llegan en vivo a los demas dispositivos (INV-8).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.cloud_inventory;
  end if;
end $$;


-- ===== 20261005000002_avatares.sql =====
-- =============================================================================
-- Fotos de perfil (AUT-3): bucket publico "avatars".
-- Cada usuario solo escribe dentro de su carpeta: avatars/<su id>/...
-- Las fotos se leen sin sesion (los perfiles son publicos).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ===== 20261005000003_optimizer_cards.sql =====
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


-- ===== 20261122000001_integridad_rendimiento.sql =====
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


-- ===== 20261123000001_catalogo_juegos.sql =====
-- =============================================================================
-- Catalogo de juegos y generos
-- =============================================================================
-- Entidades:
--   game        un juego del catalogo (nombre canonico, slug, portada)
--   genre       una etiqueta de genero (Action RPG, Gacha, Looter shooter...)
--   game_genre  M:N entre game y genre (un juego tiene varios generos y
--               viceversa)
--   game_alias  N:1 game <- alias (un juego tiene varios nombres alternativos)
--
-- Ademas:
--   * optimizers.game_id: 1:N (un juego agrupa varios optimizadores). Nullable,
--     porque las filas existentes solo tienen `game_name` en texto libre.
--   * Lectura publica; escritura solo administradores: el vocabulario es
--     compartido y no puede quedar a merced de cualquiera.
--
-- Migracion append-only. La 20261122000001 no se toca.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- genre
-- ---------------------------------------------------------------------------
create table if not exists public.genre (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Dos generos no pueden llamarse igual salvo por mayusculas o espacios.
create unique index genre_name_unique on public.genre (lower(btrim(name)));

create trigger genre_updated_at before update on public.genre
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- game
-- ---------------------------------------------------------------------------
create table if not exists public.game (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 80),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  cover_url   text check (cover_url is null or cover_url ~ '^https?://'),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index game_slug_unique on public.game (slug);
create unique index game_name_unique on public.game (lower(btrim(name)));

create trigger game_updated_at before update on public.game
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- game_genre (M:N)
-- ---------------------------------------------------------------------------
create table if not exists public.game_genre (
  game_id    uuid not null references public.game (id) on delete cascade,
  genre_id   uuid not null references public.genre (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, genre_id)
);

-- La PK cubre game_id; falta el camino inverso ("todos los juegos de X genero").
create index game_genre_genre_idx on public.game_genre (genre_id);

-- ---------------------------------------------------------------------------
-- game_alias (N:1)
-- ---------------------------------------------------------------------------
create table if not exists public.game_alias (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.game (id) on delete cascade,
  alias      text not null check (char_length(btrim(alias)) between 1 and 80),
  created_at timestamptz not null default now()
);

-- El alias existe para resolver una busqueda a UN juego: no puede repetirse
-- entre juegos. Mismo criterio que el nombre (sin distinguir mayusculas).
create unique index game_alias_unique on public.game_alias (lower(btrim(alias)));
create index game_alias_game_idx on public.game_alias (game_id);

-- ---------------------------------------------------------------------------
-- optimizers.game_id: un juego agrupa varios optimizadores
-- ---------------------------------------------------------------------------
-- SET NULL, no CASCADE: retirar un juego del catalogo no borra los
-- optimizadores que la comunidad publico.
alter table public.optimizers
  add column game_id uuid references public.game (id) on delete set null;

create index optimizers_game_idx on public.optimizers (game_id);

-- ---------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------
alter table public.game       enable row level security;
alter table public.genre      enable row level security;
alter table public.game_genre enable row level security;
alter table public.game_alias enable row level security;

-- Supabase concede todo a anon/authenticated por defecto: se parte de cero.
revoke all on public.game, public.genre, public.game_genre, public.game_alias
  from anon, authenticated;

-- El catalogo es publico de lectura.
grant select on public.game, public.genre, public.game_genre, public.game_alias
  to anon, authenticated;

-- Escritura: solo administracion. Se conceden columnas, no la tabla entera.
grant insert (slug, name, description, cover_url, created_by) on public.game to authenticated;
grant update (slug, name, description, cover_url) on public.game to authenticated;
grant delete on public.game to authenticated;

grant insert (name, description) on public.genre to authenticated;
grant update (name, description) on public.genre to authenticated;
grant delete on public.genre to authenticated;

grant insert (game_id, genre_id) on public.game_genre to authenticated;
grant delete on public.game_genre to authenticated;

grant insert (game_id, alias) on public.game_alias to authenticated;
grant update (alias) on public.game_alias to authenticated;
grant delete on public.game_alias to authenticated;

create policy game_select on public.game for select using (true);
create policy game_insert on public.game for insert to authenticated
  with check (public.is_admin());
create policy game_update on public.game for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy game_delete on public.game for delete to authenticated
  using (public.is_admin());

create policy genre_select on public.genre for select using (true);
create policy genre_insert on public.genre for insert to authenticated
  with check (public.is_admin());
create policy genre_update on public.genre for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy genre_delete on public.genre for delete to authenticated
  using (public.is_admin());

create policy game_genre_select on public.game_genre for select using (true);
create policy game_genre_insert on public.game_genre for insert to authenticated
  with check (public.is_admin());
create policy game_genre_delete on public.game_genre for delete to authenticated
  using (public.is_admin());

create policy game_alias_select on public.game_alias for select using (true);
create policy game_alias_insert on public.game_alias for insert to authenticated
  with check (public.is_admin());
create policy game_alias_update on public.game_alias for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy game_alias_delete on public.game_alias for delete to authenticated
  using (public.is_admin());

-- El autor de un optimizador puede enlazarlo a un juego del catalogo, pero no
-- puede mover el puntaje ni editar filas ajenas (la policy sigue mandando).
grant insert (game_id) on public.optimizers to authenticated;
grant update (game_id) on public.optimizers to authenticated;


-- ===== 20261124000001_unificar_juego.sql =====
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
    -- Â¿Ya existe un juego con ese nombre?
    select g.id into target
    from public.game g
    where lower(btrim(g.name)) = lower(btrim(r.game_name))
    limit 1;

    if target is null then
      -- Slug a partir del nombre: minusculas, sin acentos, guiones.
      slug_base := lower(btrim(r.game_name));
      slug_base := translate(slug_base, 'Ã¡Ã Ã¤Ã¢Ã£Ã©Ã¨Ã«ÃªÃ­Ã¬Ã¯Ã®Ã³Ã²Ã¶Ã´ÃµÃºÃ¹Ã¼Ã»Ã±Ã§', 'aaaaaeeeeiiiiooooouuuunc');
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


-- ===== 20261125000001_privilegios_por_defecto.sql =====
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
-- sigue protegiendo las filas, pero TRUNCATE no pasa por RLS â un
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


-- ===== 20261125000002_vista_con_generos.sql =====
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


-- ===== 20261125000003_gifts_y_stripe_events.sql =====
-- =============================================================================
-- Suscripciones: donaciones de meses y eventos de Stripe
-- =============================================================================
-- Dos tablas con propositos distintos que comparten una regla: las escribe el
-- servidor, no el cliente.
--
--   subscription_gifts  libro de meses regalados de un usuario a un creador
--                       (SUB-36 "donar meses", SUB-38 "ver lo que recibi")
--   stripe_events       registro de eventos del webhook, para idempotencia
--                       (TEC-09, pasarela de pago)
--
-- Por que una tabla y no una columna en `subscriptions`: `subscriptions` es
-- ESTADO (una fila por usuario, con plan y fecha de corte). Una donacion es un
-- HECHO con fecha, origen y destino; dos donaciones al mismo creador son dos
-- filas, y el estado del receptor no las puede representar. Ademas el estado
-- del receptor se deriva (se extiende current_period_end), mientras que el
-- historial de quien dono y quien recibio tiene que sobrevivir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- subscription_gifts
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_gifts (
  id             uuid primary key default gen_random_uuid(),

  -- Quien regala. Nullable: si el donante borra su cuenta, la donacion sigue
  -- siendo un hecho y el receptor no debe perder el registro.
  from_user_id   uuid references public.profiles (id) on delete set null,

  -- Quien recibe. Nullable por la misma razon; una donacion no se borra porque
  -- el creador se vaya.
  to_user_id     uuid references public.profiles (id) on delete set null,

  months         integer not null check (months between 1 and 60),

  -- `pending` mientras el pago no se confirma; lo mueve el webhook. No se
  -- acepta `granted` directo desde el cliente: el policy de INSERT no existe.
  status         text not null default 'pending'
                 check (status in ('pending', 'paid', 'cancelled', 'refunded')),

  -- Referencia al pago. UNIQUE: un mismo pago no puede acreditar dos veces.
  payment_ref    text unique,

  -- Si el donante deja un mensaje para el creador (opcional, por producto).
  message        text check (message is null or char_length(message) <= 280),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Nadie se regala meses a si mismo.
  constraint subscription_gifts_distintos check (from_user_id is distinct from to_user_id)
);

-- Un creador consulta lo que recibio; un donante, lo que dio. Los dos llevan
-- indice porque son las dos unicas lecturas previstas (SUB-38).
create index if not exists subscription_gifts_to_idx
  on public.subscription_gifts (to_user_id, created_at desc);
create index if not exists subscription_gifts_from_idx
  on public.subscription_gifts (from_user_id, created_at desc);

create trigger subscription_gifts_updated_at before update on public.subscription_gifts
  for each row execute function public.set_updated_at();

alter table public.subscription_gifts enable row level security;

-- El cliente no escribe: no hay policy de INSERT, UPDATE ni DELETE, y ademas
-- se revoca el privilegio de tabla para que ni siquiera llegue a evaluarse.
revoke all on public.subscription_gifts from anon, authenticated;
grant select on public.subscription_gifts to authenticated;

-- Cada parte ve sus filas. El receptor ve lo que le donaron; el donante, lo
-- que dono. Nadie mas.
create policy subscription_gifts_select on public.subscription_gifts
  for select to authenticated
  using (to_user_id = auth.uid() or from_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- stripe_events
-- ---------------------------------------------------------------------------
-- Idempotencia del webhook: Stripe reintenta un evento si no recibe 2xx, y sin
-- esta tabla un reintento acreditaria los meses dos veces. `event_id` es la
-- clave natural que Stripe garantiza estable entre reintentos.
create table if not exists public.stripe_events (
  event_id     text primary key check (char_length(event_id) between 1 and 255),
  type         text not null check (char_length(type) between 1 and 120),

  -- `received` al insertar; `processed` cuando la logica termino; `failed` si
  -- revento, para poder reintentar a mano.
  status       text not null default 'received'
               check (status in ('received', 'processed', 'failed')),

  -- Copia del cuerpo del evento. Sirve para reproducir un fallo sin pedirle
  -- nada a Stripe, y para auditar. Se acota para que un evento enorme no llene
  -- la tabla.
  payload      jsonb check (payload is null or octet_length(payload::text) <= 1000000),

  error        text check (error is null or char_length(error) <= 1000),

  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- Para barrer los que quedaron a medias.
create index if not exists stripe_events_status_idx
  on public.stripe_events (status, received_at desc);

alter table public.stripe_events enable row level security;

-- Solo el servidor (service_role, que salta RLS) la toca. No se concede nada a
-- anon ni a authenticated: no hay lectura ni escritura desde el cliente, ni
-- siquiera para leer el estado de un pago.
revoke all on public.stripe_events from anon, authenticated;


