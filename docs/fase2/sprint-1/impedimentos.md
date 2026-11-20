# Sprint 1 — Impedimentos

Registro de bloqueos del sprint. Cada uno indica cómo se resolvió, no solo que existió.

## IMP-01 — El prototipo y el monorepo compiten por el mismo motor

**Problema.** El PR #2 entrega un motor completo dentro de `demo/`. El monorepo necesita ese
motor en `libs/core-engine`. La opción barata era importar el prototipo; la correcta era portarlo.

**Resolución.** Port con pruebas propias, archivo por archivo. `demo/` queda congelado como
referencia y no se toca más.

**Consecuencia.** El motor de `libs` divergió del de `demo`. Hoy Sonar lo detecta como
duplicación si `demo/` entra en el análisis — fue una de las razones para excluirlo.

## IMP-02 — Las migraciones de Supabase no eran idempotentes

**Problema.** Correr las migraciones dos veces fallaba porque las tablas ya existían.

**Resolución.** `IF NOT EXISTS` en cada `CREATE TABLE`, y se versionaron en `supabase/migrations`.

## IMP-03 — Conflicto de configuración de Vercel

**Problema.** El `vercel.json` del prototipo y el del monorepo definían rewrites distintos y el
merge generaba conflicto recurrente.

**Resolución.** Se conservó la versión de GitHub y se documentó en `docs/configurar-despliegue.md`
que el proyecto de Vercel sirve `apps/web`, no `demo/`.

## IMP-04 — Decisión de cuentas de servicio sin cerrar

**Problema.** SP-02 investigaba cómo manejar cuentas de servicio en Supabase. Sin esa decisión,
RLS no se podía diseñar, y sin RLS el inventario en la nube quedaba sin modelo de permisos.

**Estado al cierre.** **Resuelto.** Jira registra SP-02 como `Done`, aunque no guarda la fecha de
la transición, así que el cierre no se puede fechar dentro del sprint con precisión.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-01 | Motor duplicado entre prototipo y monorepo | Resuelto |
| IMP-02 | Migraciones no idempotentes | Resuelto |
| IMP-03 | Conflicto de `vercel.json` | Resuelto |
| IMP-04 | Decisión de cuentas de servicio | Resuelto (SP-02 `Done`) |
