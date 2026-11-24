# Sprint 2 — Daily

Bitácora reconstruida desde las fechas de commit. No existió un daily escrito durante el sprint: el
equipo trabajaba en horarios distintos y la coordinación se realizó por chat. Se declara para no
presentar como acta lo que constituye una reconstrucción.

**Ventana:** 19 de octubre al 1 de noviembre de 2026.

## 19 de octubre

- Se integra `origin/main` con las evidencias de Fase 2 y la configuración de la demo.
- Se ajusta el título esperado en la prueba e2e a «Zenith Optimizer». El cambio de marca rompía
  una aserción que comparaba texto exacto.

## 25 de octubre

- Aparece un fallo de resolución de dependencias: `@zenith/core-engine` no figuraba en el lockfile
  y el build limpio fallaba. Se registra y se mergea mediante el PR #3
  (`fix/lockfile-core-engine`).

## 1 de noviembre

- **Esquema en el repositorio.** Las migraciones dejan de residir en la consola de Supabase y pasan
  a `supabase/migrations/`, aplicables desde cero.
- **Pruebas RLS automatizadas.** Se utiliza `@electric-sql/pglite` para levantar un Postgres
  embebido. Las políticas se prueban en CI sin servidor ni credenciales.
- **Tipos generados desde el esquema.** `libs/shared-types` deja de mantener los tipos a mano.
- Casos borde del motor (TEC-12): inventario vacío, restricciones sin solución y múltiples
  objetivos.

## Observación sobre la cadencia

Tres días con actividad en dos semanas. El registro es honesto: en este sprint se tomaron
decisiones sobre el modelo de datos, las políticas de acceso y los criterios visuales, que no dejan
commit. Un sprint medido solo por commits parece vacío aunque haya avanzado. Medido por decisiones
tomadas, es el más denso del proyecto.
