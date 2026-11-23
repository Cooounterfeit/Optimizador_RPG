# Supabase en Zenith Optimizer

El esquema de la base vive en este directorio y es la única fuente de verdad de cómo se ven los
datos. La app funciona sin Supabase: todo queda en el navegador. Con Supabase se activan las cuentas
(AUT-1 a AUT-3) y la copia de los juegos en la nube (INV-8). La base ya incluye las tablas de
comunidad (optimizadores, votos, favoritos, reportes) para las HUB.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com), crea una organización y un proyecto en el plan
   gratuito. La región no se puede cambiar después de crear el proyecto: elegí la más cercana a
   los usuarios. Producción está en **US West (Oregon)** (`us-west-2`).
2. Guarda la contraseña de la base de datos en un lugar seguro. La app no la usa.

## 1bis. Entorno local (Docker) y cómo ver la base

`supabase/config.toml` está versionado: `supabase start` levanta Postgres 17, Auth, Storage y
Studio con las migraciones de `supabase/migrations/` aplicadas. Los datos viven en un volumen de
Docker; `supabase db reset` los recrea desde cero.

```bash
supabase start      # primera vez: descarga imagenes (~3 GB)
supabase status     # puertos, claves y URLs
supabase db reset    # reaplica las migraciones sobre una base limpia
supabase stop
```

| Herramienta | Uso | Dónde |
|---|---|---|
| **Studio** | Ver tablas, filas, políticas RLS y SQL Editor | <http://127.0.0.1:54323> |
| **DBeaver / pgAdmin** | Modelo, ERD, edición de datos | `127.0.0.1:54322`, usuario `postgres`, clave `postgres` |
| **Mailpit** | Correos de registro/login sin SMTP real | <http://127.0.0.1:54324> |

`supabase/db-connection.txt` tiene la cadena de conexión lista para copiar.

Para que la app use el stack local, `apps/web/.env.local` apunta a
`http://127.0.0.1:54321` con la anon key que imprime `supabase status -o env`.

### Regla del GUI: mirar sí, cambiar no

El esquema vive en `supabase/migrations/` y nada más. Un cambio hecho en Studio o en DBeaver
**no llega al repositorio** y deja los tests de RLS validando un esquema que ya no es el real.
El flujo es: diseñar y explorar en local → escribir el cambio como migración nueva →
`supabase db reset` para comprobarlo → `supabase db push` contra el proyecto remoto.

### SQL Developer y Data Modeler no sirven para esta base

Ambos son herramientas de **Oracle**. SQL Developer 22.2 conecta a Oracle, MySQL, SQL Server,
Sybase y DB2; Data Modeler 22.2 importa de Oracle, SQL Server y DB2 y exporta DDL solo para esos
motores. **PostgreSQL no está entre ellos**, y Oracle no distribuye los drivers de terceros. Para
esta base se usa Studio (local), DBeaver o pgAdmin.

### `esquema_completo.sql`

`supabase/esquema_completo.sql` es una copia **generada** de todas las migraciones en un solo
archivo, para pegar en el SQL Editor de un proyecto nuevo. No se edita a mano: si cambia una
migración, se regenera.

## 2. Aplicar las migraciones

En el panel del proyecto, abre **SQL Editor → New query** y ejecuta, en este orden:

1. `migrations/20261005000001_esquema_inicial.sql`: tablas, permisos y reglas de seguridad (RLS).
2. `migrations/20261005000002_avatares.sql`: el bucket público `avatars` para las fotos de perfil.
3. `migrations/20261005000003_optimizer_cards.sql`: la vista liviana del catálogo para el hub.
4. `migrations/20261122000001_integridad_rendimiento.sql`: auditoría de reportes, recálculo de
   puntaje por sentencia, `cover` como columna generada e índices que faltaban.
5. `migrations/20261123000001_catalogo_juegos.sql`: catálogo de juegos y géneros
   (`game`, `genre`, `game_genre` y `game_alias`) más `optimizers.game_id`.
6. `migrations/20261124000001_unificar_juego.sql`: el nombre del juego sale del catálogo
   (`optimizers.game_name` desaparece y la vista lo resuelve con un join).
7. `migrations/20261125000001_privilegios_por_defecto.sql`: un objeto nuevo de `public` ya no
   nace con permisos para `anon`/`authenticated`, y se cierran los dos que habían quedado
   abiertos.
8. `migrations/20261125000002_vista_con_generos.sql`: `optimizer_cards` expone `game_id` y
   `genres text[]`; `optimizers.category` desaparece.
9. `migrations/20261125000003_gifts_y_stripe_events.sql`: `subscription_gifts` (meses regalados)
   y `stripe_events` (idempotencia del webhook).

`supabase/seed.sql` siembra el vocabulario de géneros y el juego sintético `Astral Forge`.
Está activado en `config.toml` (`[db.seed] enabled = true`), así que corre en cada
`db reset`.

Una migración aplicada **no se edita**: un cambio nuevo es un archivo nuevo con fecha mayor.
Editar una aplicada hace que el repo y la base ya construida diverjan.

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) también sirve `supabase link --project-ref <id>`
y luego `supabase db push`.

### Si la red no tiene IPv6

Las conexiones directas de Supabase resuelven **solo a IPv6** (`db.<ref>.supabase.co` no tiene
registro A). En una red sin IPv6 el push falla con `Host desconocido` o `ENOTFOUND`, y no hay
forma de arreglarlo desde el cliente.

La salida es el **session pooler**, que sí tiene IPv4. En el panel: **Connect → Agrupador de
sesiones**. La URL cambia de forma: el usuario lleva el ref pegado.

```bash
# en lugar de [REDACTED:connection_string]db.<ref>.supabase.co:5432/postgres
supabase db push --remote="[REDACTED:connection_string]aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Si no sabés la región, `--dry-run` contra cada candidato distingue los casos: la región
equivocada responde `tenant/user ... not found`, la correcta responde `Remote database is up to
date.` Sin `--dry-run` no hay riesgo de escritura en una región equivocada, porque la conexión
nunca llega a establecerse.

### Regla de migraciones

**Append-only.** Un archivo aplicado nunca se edita. Un cambio es un archivo nuevo
(`202610050000003_descripcion.sql`) que se aplica después. Esto vale tanto en el repo como en el
proyecto real.

## 3. Ajustes de autenticación

En **Authentication → Sign In / Providers → Email**:

- Deja **Email** activado.
- **Confirm email**: se deja **activado**. El usuario recibe el enlace, lo abre y recien ahi entra.
  La app ya lo contempla: `signUp` devuelve `needsConfirmation` y muestra «revisa tu correo», y
  `detectSessionInUrl` toma la sesion del enlace al volver.
- **Minimum password length**: 8.

### El correo necesita un SMTP propio antes de una demo

El SMTP integrado de Supabase esta pensado para pruebas y tiene un limite muy bajo de envios por
hora. Al pasarlo, el registro falla con `429 over_email_send_rate_limit` y el usuario se queda sin
poder entrar. Paso en staging el 18-nov-2026 con dos intentos seguidos.

Para cualquier presentacion, configura un SMTP real en **Authentication → SMTP Settings**
(Resend, SendGrid o el de la universidad, todos tienen plan gratuito). Mientras tanto se puede
subir el limite en **Authentication → Rate Limits**, pero sigue siendo un servicio de prueba: los
correos pueden no llegar.

Sin esto, el flujo de alta depende de un correo que puede tardar o no llegar, y el registro queda a
medio camino.

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:4200` en desarrollo (`nx serve web` sirve en ese puerto).
- **Redirect URLs**: sin esto el enlace del correo vuelve al Site URL y termina en una pagina que
  no existe. Carga cada destino con `/**`:
  - `http://localhost:4200/**`
  - `https://optimizadorrpg.vercel.app/**`
  - `https://optimizadorrpg-*-zenith-squad.vercel.app/**` — comodin para los previews de Vercel,
    que cambian de dominio en cada rama y en cada deploy.

El comodin se acota al nombre del proyecto porque `https://*.vercel.app/**` autorizaria a cualquier
proyecto de Vercel a pedir enlaces contra esta app.

## 4. Conectar la app

En **Project Settings → API** copia la **Project URL** y la clave **anon public**. Luego, desde la
raíz del monorepo:

```bash
cp apps/web/.env.example apps/web/.env.local
# edita apps/web/.env.local:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
```

La clave **service_role** nunca va en el front ni en el repositorio: se salta todas las reglas de
seguridad. El cableado del código a estas variables es F5.

## 5. Primer administrador

Los administradores pueden editar o borrar optimizadores ajenos y revisar reportes. Nadie puede
darse ese rol desde la app. Para nombrar uno, en el SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu@correo.cl');
```

## Qué hay en la base

| Tabla | Qué guarda | Quién la ve / escribe |
| --- | --- | --- |
| `profiles` | Nombre, foto, descripción, rol | Lectura pública · cada uno edita lo suyo (no el rol) |
| `subscriptions` | Plan y estado | Cada uno ve la suya · solo el servidor la cambia (Stripe, más adelante) |
| `optimizers` | Plantilla del juego (jsonb), objetos de muestra, publicado, puntaje | Públicos para todos · crea quien tiene sesión · edita o borra el autor o un admin |
| `votes` | Un voto (+1 o −1) por usuario y optimizador | Lectura pública · no se vota el propio ni un borrador · el puntaje se calcula solo |
| `favorites` | Optimizadores guardados | Solo el dueño |
| `reports` | Reportes de contenido | El que reporta ve los suyos · el admin ve y resuelve todos |
| `cloud_inventory` | «Mis juegos»: plantilla, objetos y estado del personaje | Solo el dueño |
| `app_settings` | `cloud_requires_subscription` | Lectura pública |

`app_settings.cloud_requires_subscription` está en `false`: mientras no haya pagos, cualquier usuario
con sesión puede usar la nube. Al integrar Stripe se pone en `true`, y entonces quien no tenga el
plan pro conserva lo guardado pero ya no puede modificarlo (INV-8).

## Pruebas de seguridad

`tests/rls.spec.ts` corre la migración real sobre un PostgreSQL en memoria (PGlite) y prueba cada
regla con distintos usuarios: visitante, dueño, otro usuario y admin. Cubre más de 60 casos.

```bash
npx nx test supabase
```

La migración de avatares no se prueba ahí: necesita el esquema `storage` de Supabase, que PGlite no
trae. Esa parte se valida contra el proyecto real.

## Tipos

`libs/shared-types/src/lib/database.types.ts` está escrito con el formato de `supabase gen types`.
Con el proyecto enlazado se puede regenerar:

```bash
npx supabase gen types typescript --project-id <id> > libs/shared-types/src/lib/database.types.ts
```

## Referencia

`demo/supabase/` conserva la versión original del prototipo archivado. Este directorio es el que
manda.
