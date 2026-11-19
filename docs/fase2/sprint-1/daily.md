# Sprint 1 — Daily

Bitácora asíncrona. El equipo no tuvo reuniones diarias en este sprint: el registro se
reconstruye desde el historial de commits y las decisiones quedan documentadas por fecha.

## 6 de octubre

- Bootstrap del monorepo con Nx, Vite y TypeScript (**TEC-10**).
- Prototipo completo del motor en `demo/` con niveles, árbol de habilidades y Supabase (**PR #2**).
- Decisión: el prototipo queda como referencia, no se migra código sin revisión.

## 12 de octubre

- Port del motor a `libs/core-engine`: `optimizer.ts`, `formula.ts`, `graph.ts`, `leveling.ts`,
  `curves.ts`, `skills.ts`, `validate.ts`, `analysis.ts`, con pruebas propias (**TEC-12**).
- Contrato de juego completo con Zod en `libs/shared-types` (**DPG-01 a DPG-05**).
- Decisión: el motor se porta con pruebas, no se copia. Es lo que permite que `demo/` quede
  congelado sin arrastrar deuda.

## 13 de octubre

- Migraciones SQL de Supabase con `if not exists` para que sean idempotentes.
- Configuración de Vercel con rewrites para el prototipo.
- Se resuelve un conflicto de `vercel.json` conservando la versión de GitHub.
- Evidencia de Fase 2 recolectada.

## 16 de octubre

- Autenticación con registro e inicio de sesión (**AUT-1**, **AUT-2**).
- Persistencia del inventario en la nube (**INV-8**).

## 18 de octubre — cierre

- Cierre del sprint con 26 de 35 puntos.
- Se traslada CFG-05, CFG-06 y SP-02 al sprint siguiente.

## Observación sobre la cadencia

Las entradas no cubren todos los días del sprint. Eso es un registro honesto, no un vacío
documental: el trabajo se concentró en tres jornadas. Un sprint con cadencia diaria habría
producido una curva de burndown suave; esta produjo escalones, y así se refleja.
