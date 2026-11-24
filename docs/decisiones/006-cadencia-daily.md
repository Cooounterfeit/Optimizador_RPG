# ADR 006: Cadencia de la daily

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

La asignatura solicita una daily por cada día hábil del sprint. El equipo tiene tres integrantes
que cursan otras asignaturas y trabajan en horarios distintos. Una reunión diaria sincrónica a
hora fija no resultaba viable sin excluir a alguno de ellos.

Al mismo tiempo, el proyecto exige trazabilidad verificable. Una bitácora que presente como acta algo que no ocurrió no sirve para ese propósito. El evaluador la contrasta con el historial de commits y con Jira.

## Decisión

La daily es **asíncrona y escrita**. Cada integrante deja su registro cuando trabaja. La duración esperada es de 2 a 15 minutos. Ese es el tiempo que toma revisar el tablero e informar el estado.

Se establecen dos reglas:

1. **Cierre inmediato.** Si no existen cambios ni bloqueos, la daily termina en la verificación del
   backlog. No se exige contenido nuevo para cumplir con la fecha.
2. **Fuente declarada.** Cada entrada indica su origen: un commit, el estado en Jira, o ninguno de
   los dos. Cuando no existe commit, se declara de forma explícita.

El registro reside en [`docs/fase2/registro-cadencia.md`](../fase2/registro-cadencia.md), con una
fila por día hábil, incluidas las que no tuvieron actividad.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Reunión diaria sincrónica | los tres horarios no coinciden, lo que produciría ausencias sistemáticas |
| Daily semanal | no cumple la cadencia solicitada y oculta los bloqueos hasta el final |
| No documentar la cadencia | deja el trabajo invisible: los días sin commit parecen días sin avance |
| Registrar días sin sesión con contenido supuesto | contradice el historial de commits y el estado de Jira |

## Consecuencias

- La cobertura de fechas es completa: existe una fila por día hábil, sin interrupciones.
- El registro es más honesto y más verificable que un acta, pero no constituye un acta. Así lo
  declara en su encabezado.
- Los días sin actividad quedan visibles como tales. Esta información resulta útil porque muestra
  dónde se concentró el esfuerzo, y no representa un vacío que deba rellenarse.
- El Sprint 2 tomó decisiones que no generan commit (modelo de datos, políticas de acceso y
  criterios visuales). El registro lo declara en lugar de aparentar actividad inexistente.
