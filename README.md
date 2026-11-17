# Zenith Optimizer

Plataforma comunitaria de optimizadores de builds para videojuegos. El motor es un
**solver genérico client-side** (Web Workers, ramificación y poda exacta) que consume
**configuraciones de juego en JSON**. El servidor (Supabase) guarda y reparte; nunca calcula.

## Cómo empezar

Requisitos: **Git** y **Node con `nvm`** (la versión está fijada en `.nvmrc`).


```bash
git clone https://github.com/Cooounterfeit/Optimizador_RPG.git
cd Optimizador_RPG
git checkout main          # o la rama del PR en curso
nvm use                    # toma la Node de .nvmrc
npm ci                     # instala deps exactas del lockfile (enlaza apps/* y libs/*)
npx nx serve web           # desarrollo en http://localhost:4200
```

- **Variables de entorno:** copiá `apps/web/.env.example` a `apps/web/.env.local` y completá
  las claves. Nunca commitear `.env.local`.
- **Tests e2e:** requieren `npx playwright install` (baja los navegadores). Unitarios, build
  y lint no lo necesitan.
- **Tras cada `nx g`:** correr `npm install` — los generadores editan `package.json` pero npm
  no instala solo.

### Con Docker

El despliegue no necesita Node instalado: nginx sirve el build estático. Requiere Docker
Desktop con contenedores Linux.

```bash
docker compose up --build          # http://localhost:8080
docker compose down                # detiene y limpia
```

Para apuntar a otro Supabase, las variables van en un `.env` junto al `docker-compose.yml`
(o en el entorno). **Vite las hornea durante el build**, así que cambiar una exige
reconstruir la imagen:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
WEB_PORT=8080
```

Sin variables, la app arranca en modo local con fixtures. La `anon key` es pública por
diseño — la protección real son las políticas RLS. Nunca pasar la `service_role` key.

> Nota (npm 11): si al instalar aparece un aviso sobre *install scripts* de `esbuild`, `nx` o
> `@swc/core`, aprobalos con `npm install-scripts approve esbuild nx @swc/core` si algo del
> build falla.

## Estructura del monorepo

| Ruta | Qué es |
|---|---|
| `apps/web` | Frontend React + Vite |
| `docs/` | Arquitectura, entornos, pruebas y ADRs |
| `libs/core-engine` | Solver branch & bound, fórmulas, curvas de nivel |
| `libs/data-access` | Persistencia local del inventario con Dexie |
| `libs/inventory` | Validación y parseo del inventario importado |
| `libs/shared-types` | Contrato compartido: esquemas Zod + tipos |
| `supabase/` | Migraciones SQL, políticas RLS y pruebas de la base |
| `docker/` | Configuración de nginx para servir el build |
| `demo/` | Prototipo archivado — **congelado** (ver `demo/NOTA.md`) |
| `Fase 1/`, `Fase 2/` | Evidencia APT — **no modificar** |

## Documentación

El detalle técnico vive en [`docs/`](./docs/README.md): arquitectura, entornos, estrategia de
pruebas, Definition of Ready/Done, ritmo de trabajo y los ADRs que explican por qué NX, por
qué el cálculo va al cliente, por qué Supabase y por qué Docker.

## Arquitectura

Tres capas con una regla que las ordena: **el servidor nunca calcula**.

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

**Por qué el cálculo va al cliente:** el solver explora combinaciones de inventario ×
habilidades, lo que escala de forma explosiva. En el navegador el costo marginal por
usuario es cero y el inventario no sale del dispositivo. La ramificación y poda lo hace
exacto, no heurístico: el resultado es el óptimo, no una aproximación.

**El contrato es el producto:** un optimizador es un JSON que describe un juego
(estadísticas, slots, restricciones). `shared-types` lo valida con Zod en los dos lados,
así que un optimizador creado por la comunidad se puede ejecutar sin que el motor sepa de
qué juego se trata.

## Equipo

| Integrante | Rol | Responsabilidad principal |
|---|---|---|
| Ignacio Rodríguez | Frontend & Visual Scripting Lead | UI responsive, lienzo del editor de nodos, integración del compilador |
| Arturo Moya | Optimizer Engine Lead | Solver combinatorio, compilador, esquemas multi-juego, validación Zod |
| Matías Molina | Agile Coach, QA & Release Manager | Backlog y sprints, estrategia de pruebas, CSP y despliegue |

## Metodología

**Scrum** con sprints de dos semanas y un tablero en Jira (proyecto `ZO`) como fuente de
verdad. Cada historia de usuario lleva criterios de aceptación y estimación en puntos de
historia; el trabajo técnico que habilita una épica se registra como tarea del mismo tablero.

El flujo de una tarea es: `Por hacer` → `En curso` → `En revisión` → `Listo`. Nada se
considera terminado sin pasar lint, tipos, pruebas unitarias y build.

La calidad se sostiene en integración continua (`.github/workflows/ci.yml`): cada push y
cada PR corren `nx affected`, que valida solo los proyectos tocados. El despliegue a
producción se dispara únicamente cuando el CI termina en verde sobre `main`.

## Stack

React 18 · Vite 6 · TypeScript 5.8 · NX 23 · Supabase (Postgres + Auth + RLS) · Dexie (IndexedDB) · Zod · Vitest + Playwright.

## Comandos

```bash
npx nx serve web                        # desarrollo (http://localhost:4200)
npx nx build web                        # build de produccion
npx nx run-many -t build test lint      # todo
npx nx graph                            # grafo de dependencias
```

## Despliegue

El artefacto es un sitio estático: `apps/web/dist` tras `nx build web`. Se puede servir
desde cualquier CDN. Como es una SPA, el servidor debe devolver `index.html` en las rutas
que no correspondan a un archivo (ver `docker/nginx.conf` para el ejemplo con nginx).

Dos caminos equivalentes:

| Vía | Comando | Cuándo |
|---|---|---|
| Docker | `docker compose up --build` | Verificar el build de producción en local |
| CI/CD | push a `main` | Despliegue real |

**Variables de build:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_MOCKS`.
Vite las fija en el bundle, así que cada entorno necesita su propio build. Sin ellas la app
arranca con fixtures locales y no toca la red.

**Secretos de CI:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (Settings →
Secrets → Actions).
