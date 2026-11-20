# Sprint 2 — Daily

Bitácora reconstruida desde las fechas de commit. No existió un daily escrito durante el sprint:
el equipo trabajaba en horarios distintos y la coordinación fue por chat. Se declara para no
presentar como acta lo que es una reconstrucción.

**Ventana:** 19 de octubre al 1 de noviembre de 2026.

## 19 de octubre

- Se integra `origin/main` con las evidencias de Fase 2 y la configuración de la demo.
- Se ajusta el título esperado en la prueba e2e a «Zenith Optimizer»: el cambio de marca rompía
  una aserción que comparaba texto exacto.

## 25 de octubre

- Aparece un fallo de resolución de dependencias: `@zenith/core-engine` no estaba en el
  lockfile y el build limpio fallaba. Se registra y se mergea por PR #3 (`fix/lockfile-core-engine`).

## 1 de noviembre

- **Esquema en el repositorio.** Las migraciones dejan de vivir en la consola de Supabase y pasan
  a `supabase/migrations/`, aplicables desde cero.
- **Pruebas RLS automatizadas.** Se usa `@electric-sql/pglite` para levantar un Postgres
  embebido: las políticas se prueban en CI sin servidor ni credenciales.
- **Tipos generados desde el esquema.** `libs/shared-types` deja de mantener los tipos a mano.
- Casos borde del motor (TEC-12): inventario vacío, restricciones sin solución, múltiples objetivos.

## Observación sobre la cadencia

Tres días con actividad en dos semanas. El registro es honesto: en este sprint se tomaron
decisiones —modelo de datos, políticas de acceso, criterios visuales— que no dejan commit. Un
sprint medido solo por commits aparece vacío aunque haya avanzado; medido por decisiones
tomadas, es el sprint más denso del proyecto.
