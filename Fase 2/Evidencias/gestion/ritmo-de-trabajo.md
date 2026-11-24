# Ritmo de trabajo

Este documento explica cómo trabajó el equipo y por qué el repositorio presenta la forma actual.
Su propósito es contextualizar el historial de Git. Un evaluador que lo examine sin contexto puede interpretarlo de forma equivocada. Hay pocos commits grandes, ramas que permanecieron abiertas durante semanas y merges concentrados. Esa distribución no indica falta de trabajo, sino la forma
en que el equipo integró los cambios.

## Resumen

| Dato | Valor |
|---|---|
| Periodo con actividad | 15-sep-2026 → 23-nov-2026 |
| Commits totales en todas las ramas | 167 (141 en `main`) |
| Semanas con al menos un commit | todas las semanas del periodo |
| Sprints | 4 de dos semanas, más un sprint de arranque |
| Archivos de prueba | 95 (unitarias y e2e) |

La actividad no presentó interrupciones. Desde la semana 38 hasta la 47 existe al menos un commit
en cada semana.

## Cómo se trabajó

**Ramas por funcionalidad, integración por pull request.** El flujo fue `feat/*` y `fix/*` hacia
`main`, con pull request y revisión antes de integrar. Las ramas permanecieron abiertas el tiempo
necesario para completar la funcionalidad, no un día. Entre las registradas figuran `feat/f6.3`,
`feat/f6.4`, `feat/hoja-personaje-selector`, `chore/bootstrap-monorepo`, `feature/demo-v2` y
`fix/lockfile-core-engine`.

La consecuencia es visible: un merge puede incorporar veinte commits de una vez. El historial no
muestra el trabajo diario porque este ocurrió en la rama y no en `main`.

**Commits por funcionalidad, no por archivo.** Cada commit cierra una unidad con sentido propio. Un ejemplo es `feat(optimizer): hoja de personaje, nivel libre y selector en rejilla (6.2b)`. El
cambio no se fragmenta en commits atómicos artificiales.

**Verificación antes de integrar.** Ningún cambio se mergeó sin lint, tipos, pruebas y build en
verde. La integración continua ejecuta `nx affected`, que valida solo lo modificado y mantiene bajo
el tiempo de retroalimentación.

## Distribución por sprint

Conteo de commits por rango de fechas, sobre todas las ramas:

| Sprint | Rango | Commits | Qué concentra |
|---|---|---|---|
| Arranque | 02-sep → 16-sep | 1 | creación del repositorio |
| 1 | 05-oct → 18-oct | 12 | prototipo del motor, PR #2 y port a `libs/core-engine` |
| 2 | 19-oct → 01-nov | 7 | rediseño, catálogo y esquema Supabase con RLS |
| 3 | 02-nov → 15-nov | 20 | Dexie, hub con Supabase, F6.1 a F6.4 y F7 |
| 4 | 16-nov → 23-nov | 125 | editor de configuración, interfaz del optimizador, CI/CD, Docker y cierre |

La distribución no es uniforme. El sprint 2 registra pocos commits porque concentró decisiones y no código. Entre ellas figuran el esquema de datos, las políticas RLS y los criterios de diseño. El sprint 3 incorpora más
commits porque allí convergen las funcionalidades de la aplicación real.

El sprint 4 presenta la mayor concentración del periodo. Incluye el editor de configuración (CFG-01 a CFG-06) y la interfaz completa del optimizador (6.3.1 a 6.3.5). Añade además el presupuesto de habilidades por nivel y la infraestructura de entrega. La mayor parte de estos commits
corresponde a producto y no solo a documentación.

Un equipo de tres integrantes con dedicación parcial no produce un flujo constante de commits.
Produce entregas por funcionalidad.

## Rituales

| Ritual | Frecuencia | Duración | Salida |
|---|---|---|---|
| Sprint Planning | inicio de sprint | 1 h | Sprint Backlog comprometido |
| Daily | diaria (asíncrona) | 2 a 15 min | bloqueos visibles |
| Refinamiento | mitad de sprint | 45 min | historias listas según DoR |
| Sprint Review | fin de sprint | 45 min | incremento demostrado |
| Retrospectiva | fin de sprint | 30 min | acciones de mejora |

La daily fue asíncrona y escrita porque los tres integrantes tenían horarios distintos de trabajo
y estudio. Una reunión diaria sincrónica habría producido asistencia parcial.

## Herramientas

- **Jira (proyecto `ZO`)**: fuente operativa de épicas, historias, tareas, sprints y tablero.
- **Notion**: archivo de descubrimiento y definición inicial. No se sincroniza con Jira. Jira
  determina el estado del trabajo y Notion conserva el contexto de las decisiones.
- **GitHub**: código, pull requests e integración continua.
- **DeepWiki**: documentación generada desde el código, para evitar que se desactualice.

## Qué se aprende de este historial

1. **El tamaño del commit no mide el esfuerzo.** Un merge de veinte commits representa semanas de
   trabajo en una rama. El commit individual en `main` constituye solo el punto de integración.
2. **La trazabilidad va por funcionalidad.** Los mensajes siguen el formato `tipo(alcance): resumen`. Referencian el avance del plan, por ejemplo `F6.4`, y no el número de issue. Esta brecha se
   reconoció y se corrigió en `CONTRIBUTING.md`.
3. **La cadencia se mide por entrega, no por commit.** Cinco sprints con incremento demostrable
   aportan más que un historial diario de cambios menores.
