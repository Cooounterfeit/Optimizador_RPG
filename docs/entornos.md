# Entornos

La app es un sitio estático con variables **horneadas en el build**. No hay configuración de
runtime: el bundle que se sirve ya sabe a qué Supabase apunta. Esto simplifica el despliegue
y obliga a construir una vez por entorno.

## Matriz de ambientes

| Ambiente | Rama | Supabase | Datos | URL |
|---|---|---|---|---|
| Desarrollo | cualquiera | local (mocks o Supabase CLI) | IndexedDB + fixtures | `http://localhost:4200` |
| Docker local | cualquiera | el del build | IndexedDB + fixtures | `http://localhost:8080` |
| Staging | cada PR | **proyecto #1** | datos de prueba | URL del preview de Vercel |
| Producción | `main` | **proyecto #2** | datos reales | `https://optimizadorrpg.vercel.app` |

**Desarrollo no consume cupo de Supabase** porque corre local. Por eso tres ambientes caben
en el plan gratuito, que permite **2 proyectos activos**.

## Qué se despliega

| Carpeta | ¿Se despliega? |
|---|---|
| `apps/web` | **Sí** — es la aplicación |
| `demo/` | **No** — prototipo archivado, ver `demo/NOTA.md` |

Build: `npx nx build web` → `apps/web/dist`. El proyecto de Vercel tiene **Root Directory
vacío** (la raíz del repo) porque NX necesita el workspace completo; apuntarlo a un
subdirectorio rompe la resolución de `libs/`.

## Variables

Todas llevan prefijo `VITE_` y **terminan dentro del bundle**: son públicas, no secretos.
Vite solo expone las que empiezan con ese prefijo.

| Variable | Obligatoria | Efecto si falta | Dónde se usa |
|---|---|---|---|
| `VITE_SUPABASE_URL` | no | La app corre 100% local | `lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | no | La app corre 100% local | `lib/supabase.ts` |
| `VITE_USE_MOCKS` | no | Sin efecto | fuerza fixtures con `1` |

**Sin las dos primeras, la app no falla: funciona en modo local.** El cliente Supabase queda
en `null`, el hub usa fixtures y las pantallas de cuenta muestran un aviso.

`VITE_USE_MOCKS=1` gana sobre las credenciales: aunque existan, se usan fixtures.

### Reparto por ambiente en Vercel

| Variable | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | proyecto de producción | proyecto de staging | vacío |
| `VITE_SUPABASE_ANON_KEY` | proyecto de producción | proyecto de staging | vacío |
| `VITE_USE_MOCKS` | — | — | `1` |

Una variable `VITE_*` apuntando al Supabase equivocado es el fallo más difícil de detectar:
la app funciona perfectamente, con los datos de otro ambiente.

## Qué es público y qué es secreto

| Dato | ¿Público? | Protección real |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | Ninguna necesaria |
| `VITE_SUPABASE_ANON_KEY` | **Sí, por diseño** | Políticas RLS en Postgres |
| `service_role` key | **Nunca en el cliente** | — |

La `anon key` viaja al navegador y es visible en las herramientas de desarrollo. Eso es lo
previsto: Supabase la usa para identificar el proyecto, y **RLS decide qué puede hacer cada
usuario**. Si RLS está mal configurado, la anon key no protege nada. Por eso las políticas se
prueban (`supabase/tests/`, 68 casos) y no se asume que están bien.

La `service_role` key evita RLS por completo. Nunca se pasa al frontend ni se usa como `ARG`
en el build de Docker.

## Configurar en local

```bash
cp apps/web/.env.example apps/web/.env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npx nx serve web
```

`.env.local` está en `.gitignore`. Para trabajar sin red, dejar las variables vacías o poner
`VITE_USE_MOCKS=1`.

## Configurar con Docker

Las variables van en un `.env` junto a `docker-compose.yml`, o en el entorno del comando:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co \
VITE_SUPABASE_ANON_KEY=tu-anon-key \
docker compose up --build
```

**Cambiar una variable exige reconstruir la imagen.** `docker compose up` solo reinicia el
contenedor con el bundle anterior: el valor ya está horneado dentro.

## Despliegue en Vercel

El proyecto está conectado al repositorio por **Git Integration**: cada push a `main`
despliega producción y cada PR genera un preview con su propia URL.

**No se usan secrets de Vercel en GitHub Actions.** La garantía de no publicar código roto
viene de la protección de rama: `main` solo acepta merges con los jobs de CI en verde.

### Ajustes del proyecto

| Ajuste | Valor |
|---|---|
| Root Directory | *(vacío — raíz del repo)* |
| Framework Preset | Other |
| Build Command | `npx nx build web` |
| Output Directory | `apps/web/dist` |
| Install Command | `npm ci` |
| Node | 22 |

### Por qué el CI importa más que el build

El target `build` de `apps/web` es **solo `vite build`**: no incluye `typecheck`. Vite ignora
los errores de tipos y emite el bundle igual. Un tipo mal escrito **no rompe el build de
Vercel**; rompe en el navegador del usuario.

Por eso `main` exige CI verde, que además de `build` corre `lint`, `typecheck` y 520 pruebas.

## Cabeceras y SPA

`vercel.json` define dos cosas:

- **Rewrites** `/(.*)` → `/index.html`: las rutas del router funcionan al recargar. Vercel
  sirve los archivos estáticos antes de aplicar rewrites, así que los assets no se ven
  afectados.
- **Headers**: cache inmutable de un año para `/assets/(.*)` (los nombres llevan hash) y
  `nosniff`, `Referrer-Policy` y `X-Frame-Options` en todo.

El **CSP** no es un header: se inyecta como `<meta>` en el `index.html` durante el build
(`cspPlugin` en `apps/web/vite.config.mts`). Por eso se verifica en el HTML, no con `curl -I`.

## Regla de oro

> Si un valor no puede ser público, no puede tener prefijo `VITE_`.

Cualquier secreto real pertenece a una función del servidor o a un servicio externo, nunca al
bundle del navegador.
