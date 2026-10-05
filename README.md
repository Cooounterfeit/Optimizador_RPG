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

> Nota (npm 11): si al instalar aparece un aviso sobre *install scripts* de `esbuild`, `nx` o
> `@swc/core`, aprobalos con `npm install-scripts approve esbuild nx @swc/core` si algo del
> build falla.

## Estructura del monorepo

| Ruta | Qué es |
|---|---|
| `apps/web` | Frontend React + Vite |
| `libs/shared-types` | Contrato compartido: esquemas Zod + tipos |
| `supabase/` | Migraciones y RLS (próximamente) |
| `demo/` | Prototipo archivado — **congelado** (ver `demo/NOTA.md`) |
| `Fase 1/` | Evidencia APT — **no modificar** |

## Stack

React 18 · Vite 6 · TypeScript 5.8 · NX 23 · Supabase (Postgres + Auth + RLS) · Dexie (IndexedDB) · Zod · Vitest + Playwright.

## Comandos

```bash
npx nx serve web                        # desarrollo (http://localhost:4200)
npx nx build web                        # build de produccion
npx nx run-many -t build test lint      # todo
npx nx graph                            # grafo de dependencias
```
