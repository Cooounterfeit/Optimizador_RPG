# Supabase en Zenith Optimizer

El esquema de la base de datos reside en este directorio. Constituye la única fuente de verdad sobre la estructura de los datos. La aplicación funciona sin Supabase: en ese caso todo permanece
en el navegador. Con Supabase se habilitan las cuentas (AUT-1 a AUT-3) y la copia de los juegos en
la nube (INV-8). La base ya incluye las tablas de comunidad (optimizadores, votos, favoritos y
reportes) para las historias del hub.

## 1. Crear el proyecto

1. Ingrese a [supabase.com](https://supabase.com) y cree una organización y un proyecto en el plan
   gratuito. La región no se puede modificar después de crear el proyecto. Conviene elegir la más cercana a los usuarios. Producción está en **US West (Oregon)** (`us-west-2`).
2. Guarde la contraseña de la base de datos en un lugar seguro. La aplicación no la utiliza.

## 1bis. Entorno local con Docker

`supabase/config.toml` está versionado. `supabase start` levanta Postgres 17, Auth, Storage y
Studio con las migraciones de `supabase/migrations/` aplicadas. Los datos residen en un volumen de
Docker, y `supabase db reset` los recrea desde cero.

```bash
supabase start      # primera vez: descarga imágenes (~3 GB)
supabase status     # puertos, claves y URLs
supabase db reset   # reaplica las migraciones sobre una base limpia
supabase stop
```

| Herramienta | Uso | Ubicación |
|---|---|---|
| **Studio** | consultar tablas, filas, políticas RLS y SQL Editor | <http://127.0.0.1:54323> |
| **DBeaver / pgAdmin** | modelo, ERD y edición de datos | `127.0.0.1:54322`, usuario `postgres`, clave `postgres` |
| **Mailpit** | correos de registro y login sin SMTP real | <http://127.0.0.1:54324> |

`supabase/db-connection.txt` contiene la cadena de conexión lista para copiar.

Para que la aplicación utilice el stack local, `apps/web/.env.local` apunta a `http://127.0.0.1:54321`. La anon key se obtiene con `supabase status -o env`.

### Regla de la interfaz gráfica: consultar sí, modificar no

El esquema reside en `supabase/migrations/` y en ningún otro lugar. Un cambio realizado en Studio o en DBeaver no llega al repositorio. Las pruebas de RLS quedan validando un esquema que ya no corresponde al real.

El flujo correcto consta de cuatro pasos. Primero se diseña y explora en local. Luego se escribe el cambio como migración nueva. A continuación se ejecuta `supabase db reset` para comprobarlo. Por último se aplica `supabase db push` contra el proyecto remoto.

### SQL Developer y Data Modeler no sirven para esta base

Ambas son herramientas de Oracle. SQL Developer 22.2 se conecta a Oracle, MySQL, SQL Server, Sybase
y DB2. Data Modeler 22.2 importa desde Oracle, SQL Server y DB2, y exporta DDL solo para esos
motores. PostgreSQL no está entre ellos, y Oracle no distribuye los drivers de terceros. Para esta
base se utiliza Studio en local, DBeaver o pgAdmin.

### `esquema_completo.sql`

`supabase/esquema_completo.sql` es una copia generada de todas las migraciones en un solo archivo. Está destinada a pegarse en el SQL Editor de un proyecto nuevo. No se edita manualmente: si cambia una
migración, se regenera.

## 2. Aplicar las migraciones

En el panel del proyecto, abra **SQL Editor → New query** y ejecute los archivos en este orden:

1. `migrations/20261005000001_esquema_inicial.sql`: tablas, permisos y reglas de seguridad (RLS).
2. `migrations/20261005000002_avatares.sql`: bucket público `avatars` para las fotos de perfil.
3. `migrations/20261005000003_optimizer_cards.sql`: vista liviana del catálogo para el hub.
4. `migrations/20261122000001_integridad_rendimiento.sql`: auditoría de reportes, recálculo del
   puntaje por sentencia, `cover` como columna generada e índices faltantes.
5. `migrations/20261123000001_catalogo_juegos.sql`: catálogo de juegos y géneros (`game`, `genre`,
   `game_genre` y `game_alias`), más `optimizers.game_id`.
6. `migrations/20261124000001_unificar_juego.sql`: el nombre del juego proviene del catálogo.
   `optimizers.game_name` desaparece y la vista lo resuelve mediante un join.
7. `migrations/20261125000001_privilegios_por_defecto.sql`: un objeto nuevo de `public` deja de crearse con permisos para `anon` y `authenticated`. Además se cierran los dos que habían quedado abiertos.
8. `migrations/20261125000002_vista_con_generos.sql`: `optimizer_cards` expone `game_id` y
   `genres text[]`. `optimizers.category` desaparece.
9. `migrations/20261125000003_gifts_y_stripe_events.sql`: `subscription_gifts` (meses regalados) y
   `stripe_events` (idempotencia del webhook).

`supabase/seed.sql` siembra el vocabulario de géneros y el juego sintético `Astral Forge`. Está
activado en `config.toml` mediante `[db.seed] enabled = true`, por lo que se ejecuta en cada
`db reset`.

Una migración aplicada no se edita. Un cambio nuevo requiere un archivo nuevo con fecha mayor.
Editar una migración aplicada hace que el repositorio y la base ya construida diverjan.

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) también se puede ejecutar
`supabase link --project-ref <id>` y luego `supabase db push`.

### Redes sin IPv6

Las conexiones directas de Supabase resuelven solo a IPv6: `db.<ref>.supabase.co` no tiene registro
A. En una red sin IPv6, el push falla con `Host desconocido` o `ENOTFOUND`. El problema no se puede resolver desde el cliente.

La solución es el session pooler, que sí dispone de IPv4. En el panel: **Connect → Agrupador de
sesiones**. La URL cambia de forma, y el usuario lleva el ref incorporado.

```bash
# en lugar de postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
supabase db push --remote="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Si se desconoce la región, `--dry-run` contra cada candidata permite distinguir los casos. La
región equivocada responde `tenant/user ... not found` y la correcta responde
`Remote database is up to date.` Sin `--dry-run` tampoco existe riesgo de escritura en una región
equivocada, porque la conexión nunca llega a establecerse.

### Regla de migraciones

Las migraciones son append-only. Un archivo aplicado nunca se edita. Un cambio corresponde a un
archivo nuevo (`20261005000004_descripcion.sql`) que se aplica después. Esta regla rige tanto en el
repositorio como en el proyecto real.

## 3. Ajustes de autenticación

En **Authentication → Sign In / Providers → Email**:

- Mantenga **Email** activado.
- **Confirm email**: se deja activado. El usuario recibe el enlace, lo abre y solo entonces puede
  ingresar. La aplicación lo contempla. `signUp` devuelve `needsConfirmation` y muestra el aviso de revisar el correo. `detectSessionInUrl` recupera la sesión del enlace al regresar.
- **Minimum password length**: 8.

### El correo requiere un SMTP propio antes de una demostración

El SMTP integrado de Supabase está destinado a pruebas y tiene un límite muy bajo de envíos por
hora. Al superarlo, el registro falla con `429 over_email_send_rate_limit` y el usuario queda sin
posibilidad de ingresar. Ocurrió en staging el 18-nov-2026 con dos intentos consecutivos.

Para cualquier presentación, configure un SMTP real en **Authentication → SMTP Settings**. Resend, SendGrid y el servicio institucional disponen de plan gratuito. Mientras tanto se puede elevar el límite en **Authentication → Rate Limits**. Aun así, sigue siendo un servicio de prueba y los correos pueden no llegar.

Sin esta configuración, el flujo de alta depende de un correo que puede demorar o no llegar. El registro queda incompleto.

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:4200` en desarrollo, puerto en que sirve `nx serve web`.
- **Redirect URLs**: sin esta configuración, el enlace del correo vuelve al Site URL y termina en
  una página inexistente. Cargue cada destino con `/**`:
  - `http://localhost:4200/**`
  - `https://optimizadorrpg.vercel.app/**`
  - `https://optimizadorrpg-*-zenith-squad.vercel.app/**`, comodín para los previews de Vercel.

  El comodín es necesario porque los previews cambian de dominio en cada rama y en cada
  despliegue.

El comodín se restringe al nombre del proyecto. `https://*.vercel.app/**` autorizaría a cualquier
proyecto de Vercel a solicitar enlaces contra esta aplicación.

## 4. Conectar la aplicación

En **Project Settings → API**, copie la **Project URL** y la clave **anon public**. Luego, desde la
raíz del monorepo:

```bash
cp apps/web/.env.example apps/web/.env.local
# edite apps/web/.env.local:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
```

La clave **service_role** nunca se incluye en el frontend ni en el repositorio: omite todas las
reglas de seguridad.

## 5. Primer administrador

Los administradores pueden editar o eliminar optimizadores ajenos y revisar reportes. Ningún
usuario puede asignarse ese rol desde la aplicación. Para designar uno, ejecute en el SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'tu@correo.cl');
```

## Contenido de la base de datos

| Tabla | Qué almacena | Visibilidad y escritura |
|---|---|---|
| `profiles` | nombre, foto, descripción y rol | lectura pública; cada usuario edita lo propio, sin el rol |
| `subscriptions` | plan y estado | cada usuario ve la suya; solo el servidor la modifica |
| `optimizers` | plantilla del juego (JSONB), objetos de muestra, estado y puntaje | públicos; crea quien tiene sesión; edita o elimina el autor o un administrador |
| `votes` | un voto de +1 o −1 por usuario y optimizador | lectura pública; no se vota el propio ni un borrador; el puntaje se calcula automáticamente |
| `favorites` | optimizadores guardados | solo el dueño |
| `reports` | reportes de contenido | el emisor ve los suyos; el administrador ve y resuelve todos |
| `cloud_inventory` | «Mis juegos»: plantilla, objetos y estado del personaje | solo el dueño |
| `app_settings` | `cloud_requires_subscription` | lectura pública |
| `game`, `genre`, `game_genre`, `game_alias` | catálogo de juegos y géneros | lectura pública; escritura solo de administradores |
| `subscription_gifts` | meses regalados entre usuarios | el donante y el receptor ven sus filas; solo el servidor escribe |
| `stripe_events` | eventos del webhook para garantizar idempotencia | sin acceso desde el cliente |

`app_settings.cloud_requires_subscription` está en `false`. Mientras no existan pagos, cualquier
usuario con sesión puede utilizar la nube. Al integrar Stripe se establece en `true`. Quien no tenga el plan pro conserva lo guardado, pero no puede modificarlo (INV-8).

## Pruebas de seguridad

`tests/rls.spec.ts` ejecuta la migración real sobre un PostgreSQL en memoria (PGlite). Prueba cada regla con distintos usuarios: visitante, dueño, otro usuario y administrador. Cubre 89 casos.

```bash
npx nx test supabase
```

La migración de avatares no se prueba en esa suite: requiere el esquema `storage` de Supabase, que
PGlite no incluye. Esa parte se valida contra el proyecto real.

## Tipos

`libs/shared-types/src/lib/database.types.ts` está escrito con el formato de `supabase gen types`.
Con el proyecto enlazado se puede regenerar:

```bash
npx supabase gen types typescript --project-id <id> > libs/shared-types/src/lib/database.types.ts
```

## Referencia

`demo/supabase/` conserva la versión original del prototipo archivado. Este directorio es el
vigente.
