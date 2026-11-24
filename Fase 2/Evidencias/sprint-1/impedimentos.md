# Sprint 1 — Impedimentos

Registro de los bloqueos del sprint. Cada entrada indica cómo se resolvió y no solo que existió.

## IMP-01 — El prototipo y el monorepo compiten por el mismo motor

**Problema.** El PR #2 entrega un motor completo dentro de `demo/`, mientras el monorepo necesita
ese motor en `libs/core-engine`. La opción de menor esfuerzo consistía en importar el prototipo. La
opción correcta consistía en portarlo.

**Resolución.** Port con pruebas propias, archivo por archivo. `demo/` queda congelado como
referencia y no se modifica.

**Consecuencia.** El motor de `libs` divergió del de `demo`. Hoy Sonar lo detecta como duplicación
si `demo/` entra en el análisis, y esa fue una de las razones para excluirlo.

## IMP-02 — Las migraciones de Supabase no eran idempotentes

**Problema.** Ejecutar las migraciones dos veces fallaba porque las tablas ya existían.

**Resolución.** Se agregó `IF NOT EXISTS` en cada `CREATE TABLE`, y las migraciones se versionaron
en `supabase/migrations`.

## IMP-03 — Conflicto de configuración de Vercel

**Problema.** El `vercel.json` del prototipo y el del monorepo definían rewrites distintos, y el
merge generaba un conflicto recurrente.

**Resolución.** Se conservó la versión de GitHub y se documentó en `docs/configurar-despliegue.md`
que el proyecto de Vercel sirve `apps/web` y no `demo/`.

## IMP-04 — Decisión de cuentas de servicio sin cerrar

**Problema.** SP-02 investigaba cómo manejar cuentas de servicio en Supabase. Sin esa decisión, RLS
no se podía diseñar, y sin RLS el inventario en la nube quedaba sin modelo de permisos.

**Estado al cierre.** Resuelto. Jira registra SP-02 como `Done`, aunque no guarda la fecha de la
transición, por lo que el cierre no puede fecharse dentro del sprint con precisión.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-01 | motor duplicado entre prototipo y monorepo | resuelto |
| IMP-02 | migraciones no idempotentes | resuelto |
| IMP-03 | conflicto de `vercel.json` | resuelto |
| IMP-04 | decisión de cuentas de servicio | resuelto (SP-02 `Done`) |
