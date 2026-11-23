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
