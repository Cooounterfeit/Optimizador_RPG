-- =============================================================================
-- Zenith Optimizer · esquema inicial (TEC-02) y reglas de seguridad (TEC-03)
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
-- Las pruebas de politicas estan en scripts/supabase-rls.ts (npm run rls).
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

create table public.profiles (
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

-- ¿El usuario de la peticion es administrador? (security definer: lee profiles
-- sin pasar por RLS, y no se puede usar para escalar porque solo responde).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ----------------------------------------------------------------- subscriptions

create table public.subscriptions (
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
create table public.app_settings (
  id                          boolean primary key default true check (id),
  cloud_requires_subscription boolean not null default false
);
insert into public.app_settings default values;

-- ¿Puede el usuario escribir en su inventario en la nube? (INV-8: si deja de
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
create table public.optimizers (
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

create table public.votes (
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

create table public.favorites (
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  optimizer_id uuid not null references public.optimizers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, optimizer_id)
);

-- ----------------------------------------------------------------- reports

create table public.reports (
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
create table public.cloud_inventory (
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
