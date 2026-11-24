# Sprint 1 — Daily

Bitácora asíncrona. El equipo no realizó reuniones diarias en este sprint. El registro se
reconstruye a partir del historial de commits, y las decisiones quedan documentadas por fecha.

## 6 de octubre

- Bootstrap del monorepo con Nx, Vite y TypeScript (**TEC-10**).
- Prototipo completo del motor en `demo/`, con niveles, árbol de habilidades y Supabase
  (**PR #2**).
- Decisión: el prototipo queda como referencia y no se migra código sin revisión.

## 12 de octubre

- Port del motor a `libs/core-engine`: `optimizer.ts`, `formula.ts`, `graph.ts`, `leveling.ts`,
  `curves.ts`, `skills.ts`, `validate.ts` y `analysis.ts`, con pruebas propias (**TEC-12**).
- Contrato de juego completo con Zod en `libs/shared-types` (**DPG-01 a DPG-05**).
- Decisión: el motor se porta con pruebas y no se copia. Esto permite que `demo/` quede congelado
  sin arrastrar deuda.

## 13 de octubre

- Migraciones SQL de Supabase con `if not exists`, para que resulten idempotentes.
- Configuración de Vercel con rewrites para el prototipo.
- Se resuelve un conflicto de `vercel.json` conservando la versión de GitHub.
- Se recolecta la evidencia de Fase 2.

## 16 de octubre

- Autenticación con registro e inicio de sesión (**AUT-1**, **AUT-2**).
- Persistencia del inventario en la nube (**INV-8**).
- **Sin commit que lo respalde.** El historial salta del 13 al 19 de octubre, y las rutas que hoy
  implementan esas historias se crearon en noviembre. La fecha proviene de Jira y no del
  repositorio. Está explicado en [`burndown.md`](./burndown.md), que dibuja esos 10 puntos como no
  fechados.

## 18 de octubre: cierre

- El sprint cierra con 29 de 35 puntos.
- **SP-02** figura como `Done` en Jira, sin fecha de transición registrada.
- Se trasladan CFG-05 y CFG-06 al sprint siguiente.

## Observación sobre la cadencia

Las entradas no cubren todos los días del sprint. Se trata de un registro honesto y no de un vacío
documental: el trabajo se concentró en tres jornadas. Un sprint con cadencia diaria habría
producido una curva de burndown suave. Este produjo escalones, y así se refleja.
