# Zenith Optimizer

Plataforma comunitaria de optimizadores de builds para videojuegos. El motor es un
**solver genérico client-side** (Web Workers, ramificación y poda exacta) que consume
**configuraciones de juego en JSON**. El servidor (Supabase) guarda y reparte; nunca calcula.

## Estructura del monorepo

| Ruta | Qué es |
|---|---|
| `apps/web` | Frontend React + Vite |
| `libs/shared-types` | Contrato compartido: esquemas Zod + tipos |
| `supabase/` | Migraciones y RLS (próximamente) |
| `demo/` | Prototipo archivado — **congelado** (ver `demo/NOTA.md`) |
| `Fase 1/` | Evidencia APT — **no modificar** |

## Stack

React 18 · Vite 6 · TypeScript 5.7 · NX 23 · Supabase (Postgres + Auth + RLS) · Dexie (IndexedDB) · Zod · Vitest + Playwright.

## Comandos

```bash
npm install
npx nx serve web                        # desarrollo (http://localhost:4200)
npx nx build web                        # build de produccion
npx nx run-many -t build test lint      # todo
npx nx graph                            # grafo de dependencias
```

> Tras cada `nx g` (generador), correr `npm install`: los generadores editan `package.json` pero npm no instala solo.
