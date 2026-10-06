# Supabase en Zenith Optimizer

La app funciona sin Supabase: todo queda en el navegador. Con Supabase se activan las cuentas (AUT-1 a AUT-3) y la copia de los juegos en la nube (INV-8). La base ya incluye las tablas de comunidad (optimizadores, votos, favoritos, reportes) para las HUB.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com), crea una organización y un proyecto en el plan gratuito. Elige la región **South America (São Paulo)**, que es la más cercana a Chile.
2. Guarda la contraseña de la base de datos en un lugar seguro. La app no la usa.

## 2. Crear las tablas

En el panel del proyecto, abre **SQL Editor → New query** y ejecuta, en este orden:

1. `migrations/20261005000001_esquema_inicial.sql`: tablas, permisos y reglas de seguridad (RLS).
2. `migrations/20261005000002_avatares.sql`: el bucket público `avatars` para las fotos de perfil.

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) también sirve `supabase link --project-ref <id>` y luego `supabase db push`.

## 3. Ajustes de autenticación

En **Authentication → Sign In / Providers → Email**:

- Deja **Email** activado.
- **Confirm email**: el Jira pide que el usuario entre apenas se registra (AUT-1). Para eso, desactívalo. Si lo dejas activo, la app avisa «revisa tu correo para confirmarla».
- **Minimum password length**: 8.

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` en desarrollo (y la URL de Vercel cuando despliegues).
- **Redirect URLs**: agrega `http://localhost:5173/**` y la de producción con `/**`. Sin esto, el enlace de «recuperar contraseña» no vuelve a la app.

## 4. Conectar la app

En **Project Settings → API** copia la **Project URL** y la clave **anon public**. Luego, en la raíz del proyecto:

```bash
cp .env.example .env
# edita .env:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
npm install
npm run dev
```

La clave **service_role** nunca va en el `.env` del front ni en el repositorio: se salta todas las reglas de seguridad.

## 5. Primer administrador

Los administradores pueden editar o borrar optimizadores ajenos y revisar reportes. Nadie puede darse ese rol desde la app. Para nombrar uno, en el SQL Editor:

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

`app_settings.cloud_requires_subscription` está en `false`: mientras no haya pagos, cualquier usuario con sesión puede usar la nube. Al integrar Stripe se pone en `true`, y entonces quien no tenga el plan pro conserva lo guardado pero ya no puede modificarlo (INV-8).

## Pruebas de seguridad

`npm run rls` corre la migración real sobre un PostgreSQL en memoria (PGlite) y prueba cada regla con distintos usuarios: visitante, dueño, otro usuario y admin. Cubre más de 60 casos y también corre dentro de `npm test`.

## Tipos

`src/cloud/database.types.ts` está escrito a mano con el formato de `supabase gen types`. Con el proyecto enlazado se puede regenerar:

```bash
npx supabase gen types typescript --project-id <id> > src/cloud/database.types.ts
```
