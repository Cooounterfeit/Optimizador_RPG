# ADR 003: Supabase para cuentas y catálogo comunitario

**Estado:** aceptada · **Fecha:** octubre 2026

## Contexto

La aplicación funciona de forma completamente local: el inventario reside en IndexedDB y el motor
se ejecuta en el cliente. Sin embargo, la propuesta de valor comunitaria requiere cuentas para atribuir autoría. Requiere además un catálogo compartido de optimizadores, votos, favoritos y reportes.

Esto implica un backend con autenticación, base de datos relacional y control de acceso por fila.

## Decisión

Adoptar **Supabase** (Postgres, Auth y RLS), con la `anon key` en el cliente. Las **políticas RLS** constituyen el único mecanismo de autorización.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Backend propio (Node y Postgres) | exige semanas de trabajo en autenticación, migraciones y despliegue; el equipo tiene tres integrantes con dedicación parcial |
| Firebase | utiliza un modelo documental, y los datos de optimizadores son relacionales (autor, juego, votos, favoritos) |
| Solo local, sin nube | elimina la propuesta comunitaria, que constituye el pilar del producto |
| Supabase con `service_role` en el cliente | desactiva RLS, de modo que cualquier usuario podría escribir todo |

## Consecuencias

**Beneficios:** autenticación disponible, Postgres real con migraciones versionadas y RLS declarativo. El esquema se verifica de forma local con PGlite (89 casos).

**Costos:** dependencia de un proveedor, y el equipo debe comprender RLS o los datos quedan
expuestos. La mitigación consiste en probar automáticamente las políticas y mantener la
`service_role` fuera del frontend.

**Restricción que impone.** La `anon key` es pública por diseño. La seguridad depende de RLS y no
del secreto de la clave. Toda tabla nueva se crea con RLS activo y sus políticas probadas.

**Modo degradado obligatorio.** Sin las variables de Supabase, la aplicación debe funcionar
completa de forma local. Esta condición garantiza que la dependencia no se convierta en un
requisito para utilizar el motor.
