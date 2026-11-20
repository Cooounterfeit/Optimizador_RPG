# Sprint 1 — Backlog

Estado al cierre del sprint, 18 de octubre de 2026. Fuente: Jira, proyecto `ZO`, sprint 5
("Sprint 1 — Prototipo y motor"), verificado contra la API el 20 de noviembre de 2026.

| HU | Título | Pts | Estado | Evidencia |
|---|---|---|---|---|
| ZO-60 · TEC-10 | Configurar monorepo con Nx, Vite y TypeScript | 3 | Listo | PR #1 (`build: bootstrap monorepo`) |
| ZO-62 · TEC-12 | Implementar Core Engine matemático | 3 | Listo | `libs/core-engine/src/lib/` (`optimizer.ts`, `formula.ts`, `graph.ts`) con pruebas |
| ZO-79 · DPG-01 | Variable de ataque | 2 | Listo | `libs/shared-types` + `formula.ts` |
| ZO-80 · DPG-02 | Variable de daño crítico | 2 | Listo | idem |
| ZO-81 · DPG-03 | Variable de probabilidad de crítico | 2 | Listo | idem |
| ZO-82 · DPG-04 | Variable de daño | 2 | Listo | idem |
| ZO-83 · DPG-05 | Variable de defensa del objetivo | 2 | Listo | idem |
| ZO-30 · AUT-1 | Registro de nuevo usuario | 3 | Listo | `features/auth/RegisterPage.tsx`, `supabase-auth-service.ts` |
| ZO-31 · AUT-2 | Inicio de sesión | 2 | Listo | `features/auth/LoginPage.tsx`, `guards.tsx` |
| ZO-39 · INV-8 | Guardar inventario en la nube | 5 | Listo | `libs/data-access` + migraciones de `supabase/` |
| ZO-11 · CFG-05 | Crear un nuevo juego desde cero | 3 | **Por hacer** | Se traslada al Sprint 2 |
| ZO-12 · CFG-06 | Ver la configuración completa de un juego | 3 | **Por hacer** | Se traslada al Sprint 2 |
| ZO-71 · SP-02 | Investigar el uso de Supabase y cuentas de servicio | 3 | Listo | Jira: `Done`. Sin fecha de transición registrada |

## Resumen

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 11 | 29 |
| En curso | 0 | 0 |
| Por hacer | 2 | 6 |
| **Total** | **13** | **35** |

## Traslado al Sprint 2

- **CFG-05 y CFG-06** (6 pts): dependen del editor de plantillas, que necesita primero el
  esquema de datos ya definido en `shared-types`.

## Nota sobre el alcance

Las cinco HUs de daño (DPG-01 a DPG-05, 10 pts) se resolvieron en conjunto porque comparten el
mismo contrato: son campos del modelo y su consumo en `formula.ts`. Separarlas en cinco
entregas habría fragmentado un único cambio de tipos.
