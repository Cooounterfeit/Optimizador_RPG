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
