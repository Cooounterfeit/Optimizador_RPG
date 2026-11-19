# Sprint 1 — Retrospectiva

**Fecha:** 18 de octubre de 2026

## Qué funcionó (Continue)

**Portar en vez de importar.** La decisión de reescribir el motor en `libs/core-engine` con
pruebas propias, en lugar de importar el prototipo, es lo que permite que `demo/` quede congelado
sin arrastrar deuda. Costó más en el sprint y ahorró problemas después.

**Definir el contrato antes de la UI.** `shared-types` con Zod se escribió antes de cualquier
vista. Es la razón por la que las vistas del Sprint 3 no inventaron cada una su forma de datos.

**Separar prototipo de producto.** `demo/` como referencia y no como base evitó que el código de
demostración se filtrara a producción.

## Qué no funcionó (Stop)

**El sprint no se activó en Jira mientras se trabajaba.** Sin eso no hay burndown real ni
historial de estado por día; el de este documento es reconstruido. Es la causa de la deuda de
tablero que arrastra el proyecto.

**Cinco HUs de daño (DPG-01 a DPG-05) entregadas como bloque.** Se comprometieron 10 puntos y se
cerraron el mismo día, sin transiciones visibles en el tablero. Como unidad de trabajo fue
razonable (comparten contrato), pero como unidad de seguimiento, no.

**No hubo ceremonia diaria.** El trabajo se concentró en tres jornadas de cinco días de sprint.
No es un problema de proceso en sí, pero sí lo es que el registro no lo reflejara hasta ahora.

## Qué probar (Start)

**Activar el sprint en Jira al inicio.** Sin estado histórico, cualquier métrica del sprint es
una reconstrucción, y una reconstrucción es defendible solo si se declara.

**Cerrar HUs en el día en que se completan**, no al final del sprint. Diez cierres el mismo día
ocultan cuándo se terminó cada cosa.

## Acciones

| # | Acción | Responsable | Cuándo |
|---|---|---|---|
| 1 | Activar cada sprint en Jira el primer día | Quien inicia el sprint | Sprint 2 |
| 2 | Cerrar HUs el mismo día en que se completan | Cada integrante | Sprint 2 |
| 3 | Declarar como reconstruido todo gráfico sin historial | Quien redacte la evidencia | Continuo |

## Nota para la entrega

Este sprint es el primero y el más pequeño (35 pts). Las acciones de aquí se aplicaron a medias en
los sprints siguientes: el tablero se completó recién al preparar la evidencia de Fase 2. La
retrospectiva no se corrige hacia atrás; se registra lo que pasó y lo que se decidió.
