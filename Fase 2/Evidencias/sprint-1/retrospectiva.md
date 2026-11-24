# Sprint 1 — Retrospectiva

**Fecha:** 18 de octubre de 2026

## Qué funcionó (Continue)

**Portar en lugar de importar.** La decisión de reescribir el motor en `libs/core-engine` con
pruebas propias, en vez de importar el prototipo, permitió que `demo/` quedara congelado sin
arrastrar deuda. Costó más durante el sprint y evitó problemas posteriores.

**Definir el contrato antes de la interfaz.** `shared-types` con Zod se escribió antes de cualquier
vista. Es la razón por la que las vistas del Sprint 3 no inventaron cada una su propia forma de
datos.

**Separar prototipo de producto.** Mantener `demo/` como referencia y no como base evitó que el
código de demostración se filtrara a producción.

## Qué no funcionó (Stop)

**El sprint no se activó en Jira mientras se trabajaba.** Sin esa activación no existe burndown
real ni historial de estado por día, y el de este documento es reconstruido. Es la causa de la
deuda de tablero que arrastra el proyecto.

**Cinco historias de daño (DPG-01 a DPG-05) se entregaron como bloque.** Se comprometieron 10
puntos y se cerraron el mismo día, sin transiciones visibles en el tablero. Como unidad de trabajo
resultó razonable, porque comparten contrato. Como unidad de seguimiento, no.

**No hubo ceremonia diaria.** El trabajo se concentró en tres jornadas de un sprint de cinco días.
No constituye un problema de proceso en sí, pero el registro debía reflejarlo y no lo hacía.

## Qué probar (Start)

**Activar el sprint en Jira al inicio.** Sin estado histórico, cualquier métrica del sprint
constituye una reconstrucción. Una reconstrucción es defendible solo si se declara.

**Cerrar las historias el día en que se completan** y no al final del sprint. Diez cierres el mismo
día ocultan cuándo terminó cada elemento.

## Acciones

| # | Acción | Responsable | Cuándo |
|---|---|---|---|
| 1 | Activar cada sprint en Jira el primer día | quien inicia el sprint | Sprint 2 |
| 2 | Cerrar las historias el mismo día en que se completan | cada integrante | Sprint 2 |
| 3 | Declarar como reconstruido todo gráfico sin historial | quien redacte la evidencia | continuo |

## Nota para la entrega

Este sprint es el primero y el más pequeño, con 35 puntos. Las acciones definidas aquí se aplicaron
de forma parcial en los sprints siguientes, y el tablero se completó recién al preparar la evidencia
de Fase 2. La retrospectiva no se corrige hacia atrás: registra lo que ocurrió y lo que se decidió.
