# ADR 003 — Supabase para cuentas y catálogo comunitario

**Estado:** aceptada · **Fecha:** octubre 2026

## Contexto

La app funciona completamente local: el inventario vive en IndexedDB y el motor es del
cliente. Pero la propuesta de valor comunitaria requiere cuentas (para atribuir autoría),
catálogo compartido de optimizadores, votos, favoritos y reportes.

Eso es un backend con autenticación, base de datos relacional y control de acceso por fila.

## Decisión

**Supabase** (Postgres + Auth + RLS), usando la `anon key` en el cliente y **políticas RLS**
como único mecanismo de autorización.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Backend propio (Node + Postgres) | Semanas de trabajo en auth, migraciones y despliegue; el equipo tiene 3 personas con dedicación parcial |
| Firebase | Modelo documental; los datos de optimizadores son relacionales (autor, juego, votos, favoritos) |
| Solo local, sin nube | Elimina la propuesta comunitaria, que es el pilar del producto |
| Supabase con `service_role` en el cliente | Desactiva RLS: cualquier usuario podría escribir todo |

## Consecuencias

**Ganamos:** auth lista, Postgres real con migraciones versionadas, RLS declarativo, y la
posibilidad de probar el esquema localmente con PGlite (68 casos).

**Costamos:** dependencia de un proveedor; el equipo debe entender RLS o los datos quedan
expuestos. Mitigación: las políticas se prueban automáticamente y la `service_role` nunca
toca el frontend.

**Regla que impone:** la `anon key` es pública por diseño. **La seguridad es RLS, no el
secreto de la clave.** Cualquier tabla nueva nace con RLS activo y sus políticas probadas.

**Modo degradado obligatorio:** sin variables de Supabase, la app debe funcionar completa en
local. Esa es la garantía de que la dependencia no se vuelve un requisito para usar el motor.
