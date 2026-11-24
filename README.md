# Zenith Optimizer

Plataforma comunitaria de optimizadores de builds para videojuegos. El motor es un solver
genérico client-side, con Web Workers y ramificación y poda exacta, que consume configuraciones de
juego en JSON. El servidor (Supabase) almacena y distribuye los datos, y nunca calcula.

> **Nombre y alcance.** El repositorio nació como **Optimizador RPG**, el proyecto Capstone de la
> universidad. La documentación de `docs/`, los sprints de Jira y `demo/` corresponden a esa
> entrega. El producto que continúe fuera de la facultad, **Zenith Optimizer**, puede cambiar de
> alcance, de interfaz y de arquitectura. No se espera que estos documentos lo reflejen.

## Cómo empezar

Requisitos: **Git** y **Node con `nvm`**. La versión está fijada en `.nvmrc`.

```bash
git clone https://github.com/Cooounterfeit/Optimizador_RPG.git
cd Optimizador_RPG
git checkout main          # o la rama del pull request en curso
nvm use                    # toma la versión de Node indicada en .nvmrc
npm ci                     # instala las dependencias exactas del lockfile y enlaza apps/* y libs/*
npx nx serve web           # desarrollo en http://localhost:4200
```

- **Variables de entorno:** copie `apps/web/.env.example` a `apps/web/.env.local` y complete las
  claves. Nunca confirme `.env.local` en el repositorio.
- **Pruebas e2e:** requieren `npx playwright install`, que descarga los navegadores. Las pruebas
  unitarias, el build y el lint no lo necesitan.
- **Después de cada `nx g`:** ejecute `npm install`. Los generadores editan `package.json` y npm no
  instala por sí solo.

> Nota sobre npm 11. Si al instalar aparece un aviso sobre install scripts de `esbuild`, `nx` o
> `@swc/core`, apruébelos con `npm install-scripts approve esbuild nx @swc/core` en caso de que
> alguna parte del build falle.

### Con Docker

El despliegue no requiere Node instalado: nginx sirve el build estático. Se necesita Docker
Desktop con contenedores Linux.

```bash
docker compose up --build          # http://localhost:8080
docker compose down                # detiene y limpia
```

Para apuntar a otro proyecto de Supabase, las variables se declaran en un archivo `.env` junto a
`docker-compose.yml` o en el entorno del comando. Vite las incorpora durante el build, por lo que
modificar una exige reconstruir la imagen.

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
WEB_PORT=8080
```

Sin variables, la aplicación se inicia en modo local con fixtures. La `anon key` es pública por
diseño, y la protección real son las políticas RLS. Nunca se transfiere la `service_role` key.

## Estructura del monorepo

| Ruta | Contenido |
|---|---|
| `apps/web` | frontend React y Vite |
| `docs/` | arquitectura, entornos, pruebas y ADR |
| `libs/core-engine` | solver branch and bound, fórmulas y curvas de nivel |
| `libs/data-access` | persistencia local del inventario con Dexie |
| `libs/inventory` | validación y parseo del inventario importado |
| `libs/shared-types` | contrato compartido: esquemas Zod y tipos |
| `supabase/` | migraciones SQL, políticas RLS y pruebas de la base |
| `docker/` | configuración de nginx para servir el build |
| `demo/` | prototipo archivado, congelado; ver `demo/NOTA.md` |
| `Fase 1/`, `Fase 2/` | evidencia APT; no modificar |

## Documentación

El detalle técnico reside en [`docs/`](./docs/README.md): arquitectura, entornos, estrategia de
pruebas, Definition of Ready y Done, ritmo de trabajo y los ADR que justifican NX, el cálculo en
el cliente, Supabase y Docker.

## Arquitectura

Tres capas ordenadas por una regla única: el servidor nunca calcula.

```
┌─────────────────────────────────────────────────────────┐
│  apps/web — React 18 + Vite                             │
│  ├── features/   UI por dominio (game, catalog, ...)    │
│  └── lib/        cliente Supabase, i18n, helpers        │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
    ┌───────────▼──────────┐   ┌──────────▼────────────┐
    │ libs/core-engine     │   │ libs/data-access      │
    │ Solver exacto        │   │ Dexie / IndexedDB     │
    │ branch & bound       │   │ libs/inventory        │
    │ (Web Worker)         │   │ parseo de inventario  │
    └───────────┬──────────┘   └──────────┬────────────┘
                │                         │
    ┌───────────▼─────────────────────────▼────────────┐
    │ libs/shared-types — contrato Zod                 │
    └───────────┬──────────────────────────────────────┘
                │
    ┌───────────▼──────────────────────────────────────┐
    │ Supabase — Postgres + Auth + RLS                 │
    │ guarda y reparte optimizadores; no resuelve nada │
    └──────────────────────────────────────────────────┘
```

**Justificación del cálculo en el cliente.** El solver explora combinaciones de inventario y
habilidades, un espacio que crece de forma exponencial. En el navegador, el costo marginal por
usuario es cero y el inventario no sale del dispositivo. La ramificación y poda lo vuelve exacto y
no heurístico: el resultado es el óptimo y no una aproximación.

**El contrato como producto.** Un optimizador es un JSON que describe un juego con estadísticas,
slots y restricciones. `shared-types` lo valida con Zod en ambos extremos, de modo que un
optimizador creado por la comunidad se ejecuta sin que el motor conozca el juego.

## Equipo

| Integrante | Rol | Responsabilidad principal |
|---|---|---|
| Ignacio Rodríguez | Frontend y Visual Scripting Lead | interfaz responsive, lienzo del editor de nodos e integración del compilador |
| Arturo Moya | Optimizer Engine Lead | solver combinatorio, compilador, esquemas multi-juego y validación Zod |
| Matías Molina | Agile Coach, QA y Release Manager | backlog y sprints, estrategia de pruebas, CSP y despliegue |

## Metodología

Se utiliza **Scrum** con sprints de dos semanas y un tablero en Jira (proyecto `ZO`) como fuente de
verdad. Cada historia de usuario incluye criterios de aceptación y estimación en puntos de
historia. El trabajo técnico que habilita una épica se registra como tarea del mismo tablero.

El flujo de una tarea es `Por hacer`, `En curso`, `En revisión` y `Listo`. Nada se considera
terminado sin superar lint, tipos, pruebas unitarias y build.

La calidad se sostiene en integración continua (`.github/workflows/ci.yml`). Cada push y cada pull
request ejecutan `nx affected`, que valida solo los proyectos modificados. El despliegue a
producción se activa cuando el CI termina en verde sobre `main`.

## Stack

React 18, Vite 6, TypeScript 5.8, NX 23, Supabase (Postgres, Auth y RLS), Dexie (IndexedDB), Zod y
Vitest con Playwright.

## Comandos

```bash
npx nx serve web                        # desarrollo (http://localhost:4200)
npx nx build web                        # build de producción
npx nx run-many -t build test lint      # todas las tareas
npx nx graph                            # grafo de dependencias
```

## Despliegue

El artefacto es un sitio estático: `apps/web/dist` tras `nx build web`. Se puede servir desde
cualquier CDN. Al tratarse de una SPA, el servidor debe devolver `index.html` en las rutas que no
correspondan a un archivo. El ejemplo con nginx está en `docker/nginx.conf`.

Existen dos vías:

| Vía | Comando | Cuándo se usa |
|---|---|---|
| Docker | `docker compose up --build` | verificar el build de producción en local |
| Vercel | push a `main` para producción, o abrir un pull request para preview | despliegue real |

**Variables de build:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_USE_MOCKS`. Vite las
incorpora al bundle, por lo que cada entorno requiere su propio build. Sin ellas, la aplicación se
inicia con fixtures locales y no accede a la red.

La consola de Vercel configura production sobre `main` y preview sobre cada pull request, sin
secrets de GitHub. El detalle de los tres ambientes, los ajustes del proyecto y el reparto de
proyectos de Supabase se documenta en [`docs/entornos.md`](./docs/entornos.md).
