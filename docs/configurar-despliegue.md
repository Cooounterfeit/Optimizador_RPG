# Configurar Vercel y Supabase: procedimiento paso a paso

Este documento reúne las tareas que no se pueden ejecutar desde el repositorio. Siga el orden
indicado: cada bloque verifica un resultado antes de continuar con el siguiente.

---

## 1. Vercel: reconfigurar el proyecto actual

Ingrese al proyecto de `optimizadorrpg.vercel.app` y abra **Settings**.

### 1.1 Comprobar la integración con Git

Ruta: **Settings → Git**.

| Campo | Valor esperado |
|---|---|
| Connected Git Repository | `Cooounterfeit/Optimizador_RPG` |
| Production Branch | `main` |

Si el repositorio no está conectado, conéctelo. Esta integración habilita los previews por pull
request.

Si no es posible conectar el repositorio, deténgase y consulte antes de continuar. La alternativa
es crear un proyecto nuevo.

### 1.2 Corregir el build

Ruta: **Settings → Build & Development Settings**.

| Ajuste | Valor |
|---|---|
| Framework Preset | **Other** |
| Root Directory | *(vacío, dejar la raíz)* |
| Build Command | `npx nx build web` |
| Output Directory | `apps/web/dist` |
| Install Command | `npm ci` |
| Node.js Version | `22.x` |

Con el Framework Preset en Other, es necesario activar el override de Build Command y de Output Directory. El interruptor se encuentra a la derecha de cada campo.

**Justificación de Root Directory vacío.** NX requiere resolver `libs/` desde la raíz del
workspace. Si se apunta a `apps/web`, el build falla al buscar `@zenith/core-engine`.

### 1.3 Verificar con un despliegue

Ruta: **Deployments → menú ⋯ del último → Redeploy**, desmarcando "Use existing Build Cache".

En el log, busque una de estas dos líneas:

- Correcto: `> nx run @zenith/web:build` o `vite v6 building for production`.
- Incorrecto: `cd demo && npm run build`. Indica que el paso 1.2 no se aplicó.

A continuación, abra la URL y confirme el título:

```bash
curl -s https://optimizadorrpg.vercel.app/ | findstr "<title>"
```

Debe mostrar `Zenith Optimizer · Proven builds, not guesses`.

Si aparece «Zenith Optimizer — Demo», deténgase y consulte.

### 1.4 Variables de entorno

Ruta: **Settings → Environment Variables**.

Primero revise si existen variables antiguas del demo y elimínelas. Una variable `VITE_*` que apunte al proyecto de Supabase equivocado constituye el fallo más difícil de detectar. La aplicación opera correctamente, pero sobre datos de otro ambiente.

Después cree las variables, marcando los ambientes correspondientes:

| Nombre | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | sí (proyecto real) | sí (staging) | — |
| `VITE_SUPABASE_ANON_KEY` | sí (proyecto real) | sí (staging) | — |
| `VITE_USE_MOCKS` | — | — | sí, con valor `1` |

Los valores de producción están en `demo/.env.production`. Los de staging se obtienen en el paso 2.

> Es posible dejar producción sin variables de forma temporal: la aplicación se inicia en modo
> local con fixtures. Es un modo válido y no un error, pero las cuentas no funcionarán.

---

## 2. Supabase: crear staging

### 2.1 Confirmar cuál es producción

El `project-ref` de producción es `doogvxsgmwskbvftkkli`, en la región `us-west-2` (Oregon).

El 18-nov-2026 se reemplazó el proyecto original (`fgtiiwhrspukgsubnoyl`, `ca-central-1`), que se
había creado en la región equivocada. Las migraciones se aplicaron al proyecto nuevo con `supabase db push`. El resultado se verificó con `Remote database is up to date.`

> El proyecto anterior se puede eliminar, pero solo después de comprobar un registro real contra el
> nuevo. Hasta entonces, sigue siendo la única copia de su contenido.

### 2.1.1 Contenido copiado desde el proyecto anterior

El 18-nov-2026 se copió el contenido, sin incluir cuentas:

| Tabla | Filas | Detalle |
|---|---|---|
| `optimizers` | 3 | `template` y `sample_items` idénticos al origen, verificados por comparación profunda |
| `profiles` | 2 | solo los autores de esos optimizadores: `NSY` y `ZenithOptimizer` |
| `app_settings` | 1 | provenía de la migración, con el mismo valor |
| `votes`, `favorites`, `reports`, `cloud_inventory`, `subscriptions` | 0 | no había contenido que copiar |

No se copiaron registros de `auth.users`. En consecuencia, el proyecto nuevo tiene 0 cuentas. Los
dos perfiles existen sin usuario asociado, y nadie puede iniciar sesión con ellos.

Consecuencia práctica: esos tres optimizadores resultan visibles y editables solo por un administrador. Su `author_id` apunta a un perfil sin cuenta. Cuando **NSY** y
**ZenithOptimizer** se registren, se debe reasignar la autoría:

```sql
-- con el id nuevo de cada uno, obtenido desde Authentication → Users
update public.optimizers set author_id = '<id-nuevo>'
where author_id = '<id-viejo>';

delete from public.profiles where id = '<id-viejo>';
```

Los paquetes exportados quedaron en `respaldo/optimizadores/`, por si conviene republicarlos desde
la aplicación en lugar de reasignar. Los tres validan contra `GameTemplateSchema` e `ItemSchema`.

### 2.2 Crear el proyecto de staging

Ruta: **New project**.

| Campo | Valor |
|---|---|
| Name | `zenith-staging` |
| Region | US West (Oregon), igual que producción |
| Password | genere una y guárdela |

Registre los siguientes valores:

```
STAGING_URL=https://<ref>.supabase.co
STAGING_ANON_KEY=sb_publishable_...
STAGING_REF=<ref>
```

### 2.3 Aplicar el esquema

Desde la raíz del repositorio:

```bash
npx supabase login
npx supabase link --project-ref <STAGING_REF>
npx supabase db push
```

**El orden es determinante y no resulta evidente.** Está verificado. `db push` sin `link` previo apunta al stack local (`127.0.0.1:54322`) y falla con `ECONNREFUSED` si Docker no está en ejecución. El mensaje de error no indica que falte vincular el proyecto, sino que no hay base
local. Si se ejecuta `db push` antes de `link`, es posible concluir erróneamente que se necesita
Docker.

`link` solicita un access token. Se genera en el dashboard (Account → Access Tokens) y tiene
formato `sbp_...`. La CLI valida ese formato antes que cualquier otra cosa. Un token con formato inválido falla sin mostrar otro problema.

`db push` aplica las nueve migraciones en orden, desde `esquema_inicial` hasta
`gifts_y_stripe_events`.

**Verificación.** En el dashboard de staging, abra Table Editor. Deben aparecer `profiles`,
`optimizers`, `votes`, `subscriptions`, las tablas del catálogo (`game`, `genre`, `game_genre`,
`game_alias`) y las restantes.

### 2.4 Verificar RLS

```bash
npx nx test supabase
```

Son 89 casos. Se ejecutan contra PGlite (Postgres embebido), por lo que validan las migraciones del
repositorio y no el proyecto remoto.

**Verificación del proyecto remoto.** En el dashboard de staging, abra Authentication → Providers y
confirme que Email está habilitado. Después, desde un preview de pull request, cree una cuenta y
compruebe en Table Editor que aparece en `profiles`.

La cuenta queda pendiente hasta que el usuario abra el enlace del correo, porque la confirmación
está activada. Para probar sin depender del correo se requiere un SMTP propio. Consulte
`supabase/README.md`, sección 3. El SMTP integrado de Supabase limita los envíos por hora y el
registro falla con `429 over_email_send_rate_limit`.

### 2.5 Limpiar

El directorio `.temp/` de la CLI ya está en `.gitignore`. No se debe confirmar nada de esto en el
repositorio.

---

## 3. GitHub: proteger `main`

Ruta: **Settings → Branches → Add branch protection rule**.

| Ajuste | Valor |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | sí, con 1 aprobación |
| Require status checks to pass | sí: **`Build, lint, typecheck y pruebas`** y **`E2E (Chromium)`** |
| Require branches to be up to date | sí |
| Require review from Code Owners | después de mergear el PR #12 |

Los nombres de los checks aparecen en el desplegable una vez que el CI ha corrido al menos una
vez. Si no aparecen, abra un pull request y espere a que termine.

**Justificación.** El build de Vercel ejecuta `vite build`, que no valida tipos. Sin esta
protección, un error de TypeScript se despliega igual y falla en el navegador del usuario.

---

## 4. Verificación final

| # | Comprobación | Comando | Resultado esperado |
|---|---|---|---|
| 1 | Producción sirve la aplicación real | `curl -s https://optimizadorrpg.vercel.app/ \| findstr "<title>"` | `Zenith Optimizer · Proven builds, not guesses` |
| 2 | SPA fallback | `curl -s -o NUL -w "%{http_code}" https://optimizadorrpg.vercel.app/optimizer` | `200` |
| 3 | Cache de assets | `curl -I https://optimizadorrpg.vercel.app/assets/<archivo>.js` | `cache-control: public, max-age=31536000, immutable` |
| 4 | CSP presente | `curl -s https://optimizadorrpg.vercel.app/ \| findstr "Content-Security-Policy"` | una línea con la política |
| 5 | Staging aislado | abrir un preview de PR, DevTools → Network, buscar `supabase.co` | el ref de staging, no el de producción |
| 6 | Staging no contamina | crear un optimizador en un preview | no aparece en producción |
| 7 | CI bloquea | abrir un PR con una prueba rota | GitHub no permite mergear |

La comprobación 5 es la más importante y la más fácil de omitir. Si ambos ambientes apuntan al
mismo proyecto, staging no está verificando nada.
