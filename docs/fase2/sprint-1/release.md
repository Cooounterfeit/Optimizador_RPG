# Sprint 1 — Release

## Incremento entregado

**PR #1 — Bootstrap del monorepo**

Monorepo Nx con Vite y TypeScript, tres proyectos iniciales (`apps/web`, `libs/core-engine`,
`libs/shared-types`) y la configuración base de lint, tipos y build.

**PR #2 — Prototipo v2 del motor**

Aplicación funcional en `demo/` que demuestra el motor de optimización de punta a punta: niveles,
curvas, árbol de habilidades con editor visual, hoja de personaje y persistencia en Supabase.

## Qué se puede hacer al cerrar el sprint

1. Levantar el monorepo con `npx nx serve web`.
2. Ejecutar el motor y obtener el mejor conjunto de objetos para una estadística objetivo.
3. Validar un contrato de juego completo contra el esquema Zod de `shared-types`.
4. Correr las pruebas del motor con Vitest.

## Qué no incluye

- Ninguna vista de la aplicación final: esta entrega es motor y prototipo.
- Editor de configuración de juegos (CFG-05, CFG-06 quedaron abiertas).
- Políticas RLS: el esquema existe, los permisos no.

## Estado del versionado

| Elemento | Estado |
|---|---|
| Commits en `main` | Sí |
| PRs mergeados | #1, #2 |
| **Tag de release** | **Pendiente** |

La creación de tags (`v0.1.0` y siguientes) está en el paso de releases del plan de Fase 2. Hasta
que exista, la referencia de este incremento es el rango de commits del 6 al 18 de octubre, no una
etiqueta. Se documenta así porque un documento de release que cita un tag inexistente es
verificablemente falso.

## Cómo verificar este incremento

```bash
git log --oneline --until=2026-10-18 | head
npx nx test @zenith/core-engine
npx nx build web
```
