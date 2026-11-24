# Sprint 2 — Impedimentos

## IMP-05 — El lockfile no incluía el paquete del motor

**Problema.** `@zenith/core-engine` estaba declarado como dependencia del workspace, pero no
registrado en el lockfile. Un `npm ci` desde cero fallaba porque la instalación reproducible no
resolvía el paquete.

**Impacto.** Cualquier clon nuevo, incluido CI, fallaba en el primer paso.

**Resolución.** PR #3 (`fix/lockfile-core-engine`), commit `f2ce2c9`. Se registra la dependencia y
se mergea el 25 de octubre.

## IMP-06 — Las políticas RLS no se podían probar

**Problema.** Verificar RLS requiere un Postgres con Supabase Auth. Sin esas condiciones, las
políticas solo se comprobaban a mano en el panel, y una prueba manual no se repite en cada cambio.

**Resolución.** `@electric-sql/pglite` levanta Postgres embebido dentro de la prueba. El esquema y
las políticas se aplican y se verifican dentro del proceso de test (`17044c6`). RLS pasa a ser
verificable en CI sin credenciales ni contenedores.

## IMP-07 — Los tipos de dominio se mantenían a mano

**Problema.** Cada tabla nueva obligaba a escribir su tipo manualmente, y nada garantizaba que
coincidiera con el esquema real.

**Resolución.** Los tipos se generan desde el esquema (`e07db01`) y `libs/shared-types` los
consume. Si el esquema cambia y el tipo no, el build lo detecta.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-05 | lockfile sin el paquete del motor | resuelto |
| IMP-06 | RLS no verificable de forma automática | resuelto |
| IMP-07 | tipos de dominio escritos a mano | resuelto |

Los tres se cerraron dentro del sprint. Ninguno quedó abierto al cierre.
