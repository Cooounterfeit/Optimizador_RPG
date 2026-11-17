# Configurar Vercel y Supabase: paso a paso

Lo que no se puede hacer desde el repositorio. Seguí el orden: cada bloque verifica algo antes
de pasar al siguiente.

---

## 1. Vercel: reconfigurar el proyecto actual

Entrá al proyecto de `optimizadorrpg.vercel.app` → **Settings**.

### 1.1 Comprobar la integración con Git

**Settings → Git**

| Campo | Debe decir |
|---|---|
| Connected Git Repository | `Cooounterfeit/Optimizador_RPG` |
| Production Branch | `main` |

**Si no está conectado:** conectalo. Es lo que habilita previews por PR.

**Si no se puede conectar** → avisame antes de seguir: cambia el plan a crear un proyecto
nuevo.

### 1.2 Corregir el build

**Settings → Build & Development Settings**

| Ajuste | Valor |
|---|---|
| Framework Preset | **Other** |
| Root Directory | *(vacío — dejar la raíz)* |
| Build Command | `npx nx build web` |
| Output Directory | `apps/web/dist` |
| Install Command | `npm ci` |
| Node.js Version | `22.x` |

Con el Framework Preset en Other, hay que activar el override de Build Command y Output
Directory (el interruptor a la derecha de cada campo).

**Por qué Root Directory vacío:** NX necesita resolver `libs/` desde la raíz del workspace.
Si se apunta a `apps/web`, el build falla buscando `@zenith/core-engine`.

### 1.3 Verificar con un deploy

**Deployments → ⋯ del último → Redeploy** (destildar "Use existing Build Cache").

En el log, buscar una de estas dos líneas:

- ✅ `> nx run @zenith/web:build` / `vite v6 building for production`
- ❌ `cd demo && npm run build` — el paso 1.2 no se aplicó

Después, abrir la URL y confirmar el título:

```bash
curl -s https://optimizadorrpg.vercel.app/ | findstr "<title>"
```

Debe decir `Zenith Optimizer · Proven builds, not guesses`.

**Si dice «Zenith Optimizer — Demo», no seguir.** Avisame.

### 1.4 Variables de entorno

**Settings → Environment Variables**

Primero **revisar si hay variables viejas** del demo y borrarlas. Un `VITE_*` apuntando al
Supabase equivocado es el fallo más difícil de detectar: la app anda, con datos de otro lado.

Después crear, marcando los ambientes de cada una:

| Nombre | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ (proyecto real) | ✅ (staging) | — |
| `VITE_SUPABASE_ANON_KEY` | ✅ (proyecto real) | ✅ (staging) | — |
| `VITE_USE_MOCKS` | — | — | ✅ `1` |

Los valores de producción están en `demo/.env.production`. Los de staging salen del paso 2.

> Podés dejar producción sin variables un momento: la app arranca en modo local con fixtures.
> Es un modo válido, no un error — pero las cuentas no van a funcionar.

---

## 2. Supabase: crear staging

### 2.1 Confirmar cuál es producción

El `project-ref` actual es **`fgtiiwhrspukgsubnoyl`** (está en `demo/.env.production`).

Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) y verificá que ese proyecto
es el que tiene los datos reales (tabla `profiles`, `optimizers`). **Ese queda como
producción. No se toca.**

### 2.2 Crear el proyecto de staging

**New project**:

| Campo | Valor |
|---|---|
| Name | `zenith-staging` |
| Region | South America (São Paulo) — igual que producción |
| Password | generá una y guardala |

Anotá:

```
STAGING_URL=https://<ref>.supabase.co
STAGING_ANON_KEY=sb_publishable_...
STAGING_REF=<ref>
```

### 2.3 Aplicar el esquema

Desde la raíz del repo:

```bash
npx supabase login
npx supabase link --project-ref <STAGING_REF>
npx supabase db push
```

`db push` aplica las tres migraciones en orden: `esquema_inicial`, `avatares`,
`optimizer_cards`.

**Verificar que aplicó:** en el dashboard de staging → Table Editor. Deberían estar
`profiles`, `optimizers`, `votes`, `subscriptions` y las demás.

### 2.4 Verificar RLS

```bash
npx nx test supabase
```

Son 68 casos. Corren contra PGlite (Postgres embebido), así que validan las migraciones del
repo, no el proyecto remoto.

**Para verificar el remoto:** en el dashboard de staging → Authentication → Providers,
confirmar que Email está habilitado. Después, desde un preview de PR, crear una cuenta y
comprobar en Table Editor que aparece en `profiles`.

### 2.5 Limpiar

`.temp/` de la CLI ya está en `.gitignore`. No commitear nada de esto.

---

## 3. GitHub: proteger `main`

**Settings → Branches → Add branch protection rule**

| Ajuste | Valor |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ · 1 aprobación |
| Require status checks to pass | ✅ · **`Build, lint, typecheck y pruebas`** y **`E2E (Chromium)`** |
| Require branches to be up to date | ✅ |
| Require review from Code Owners | ⏳ después de mergear el PR #12 |

Los nombres de los checks aparecen en el desplegable después de que el CI corrió al menos una
vez. Si no aparecen, abrí un PR cualquiera y esperá a que termine.

**Por qué esto es lo importante:** el build de Vercel es `vite build`, que **no** valida
tipos. Sin esta protección, un error de TypeScript se despliega igual y falla en el navegador
del usuario.

---

## 4. Verificación final

| # | Comprobación | Comando | Esperado |
|---|---|---|---|
| 1 | Producción sirve la app real | `curl -s https://optimizadorrpg.vercel.app/ \| findstr "<title>"` | `Zenith Optimizer · Proven builds, not guesses` |
| 2 | SPA fallback | `curl -s -o NUL -w "%{http_code}" https://optimizadorrpg.vercel.app/optimizer` | `200` |
| 3 | Cache de assets | `curl -I https://optimizadorrpg.vercel.app/assets/<archivo>.js` | `cache-control: public, max-age=31536000, immutable` |
| 4 | CSP presente | `curl -s https://optimizadorrpg.vercel.app/ \| findstr "Content-Security-Policy"` | Una línea con la política |
| 5 | Staging aislado | Abrir un preview de PR, DevTools → Network → buscar `supabase.co` | El ref de **staging**, no el de producción |
| 6 | Staging no contamina | Crear un optimizador en un preview | No aparece en producción |
| 7 | CI bloquea | Abrir un PR con un test roto | GitHub no permite mergear |

La #5 es la que más importa y la más fácil de saltear: si ambos ambientes apuntan al mismo
proyecto, staging no está probando nada.
