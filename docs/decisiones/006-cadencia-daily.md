# ADR 006 — Cadencia de la daily

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

La asignatura pide una daily por cada día hábil del sprint. El equipo tiene tres integrantes
que cursan otras asignaturas y trabajan en horarios distintos: una reunión diaria sincrónica a
hora fija no era viable sin que alguien quedara fuera.

Al mismo tiempo, el proyecto exige trazabilidad verificable. Una bitácora que presente como
acta algo que no ocurrió no sirve para eso: el evaluador la cruza con el historial de commits y
con Jira.

## Decisión

La daily es **asíncrona y por escrito**. Cada integrante deja su bloque cuando trabaja, y la
duración esperada es de 2 a 15 minutos: lo que toma revisar el tablero y decir en qué se está.

Se fijan dos reglas:

1. **Cierre inmediato.** Si no hay cambios ni bloqueos, la daily termina en la verificación del
   backlog. No se exige contenido nuevo por cumplir con la fecha.
2. **Fuente declarada.** Cada entrada indica de dónde sale: un commit, el estado en Jira, o
   ninguna de las dos. Cuando no hay commit, se dice explícitamente.

El registro vive en [`docs/fase2/registro-cadencia.md`](../fase2/registro-cadencia.md), con una
fila por día hábil, incluidas las que no tuvieron actividad.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Reunión diaria sincrónica | Los tres horarios no coinciden; habría ausencias sistemáticas |
| Daily semanal | No cumple la cadencia pedida y oculta los bloqueos hasta el final |
| No documentar la cadencia | Deja el trabajo invisible: los días sin commit parecen días sin avance |
| Registrar días sin sesión con contenido supuesto | Contradice el historial de commits y el propio estado de Jira |

## Consecuencias

- La cobertura de fechas es completa: hay una fila por día hábil, sin huecos.
- El registro es más honesto y más verificable que un acta, pero **no es un acta**. Lo dice en
  su encabezado.
- Los días sin actividad quedan visibles como tales. Eso es información útil —muestra dónde se
  concentró el esfuerzo— y no un vacío que haya que rellenar.
- El Sprint 2 tomó decisiones que no dejan commit (modelo de datos, políticas de acceso,
  criterios visuales). El registro lo declara en lugar de aparentar actividad que no existe.
