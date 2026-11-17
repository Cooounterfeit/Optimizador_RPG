# Ritmo de trabajo

Este documento explica **cómo trabajó el equipo** y por qué el repositorio se ve como se ve.
Existe porque un evaluador que mire el historial de Git sin contexto puede leerlo mal: hay
pocos commits grandes, ramas que vivieron semanas y merges concentrados. Eso no es falta de
trabajo, es la forma en que el equipo integró.

## Resumen

| Dato | Valor |
|---|---|
| Periodo con actividad | 15-sep-2026 → 13-nov-2026 |
| Commits totales en `main` y ramas | 49 |
| Semanas con al menos un commit | 9 de 9 |
| Sprints | 5 de dos semanas |
| Archivos de prueba | 70 (unitarias + e2e) |

La actividad no tuvo huecos: desde la semana 38 hasta la 46 hay commits todas las semanas.

## Cómo se trabajó

**Ramas por funcionalidad, integración por PR.** El flujo fue `feat/*` → `fix/*` → `main`,
con pull request y revisión antes de integrar. Las ramas vivieron el tiempo que tardó la
funcionalidad en estar completa, no un día: `feat/f6.3`, `feat/f6.4`,
`feat/hoja-personaje-selector`, `chore/bootstrap-monorepo`, `feature/demo-v2` y
`fix/lockfile-core-engine` son las que quedaron registradas.

Consecuencia visible: un merge puede traer veinte commits de golpe. El historial no muestra
el trabajo diario porque el trabajo diario ocurrió en la rama, no en `main`.

**Commits por funcionalidad, no por archivo.** Cada commit cierra una unidad con sentido
propio (`feat(optimizer): hoja de personaje, nivel libre y selector en rejilla (6.2b)`) en
lugar de fragmentar el mismo cambio en commits atómicos artificiales.

**Verificación antes de integrar.** Nada se mergeó sin lint, tipos, pruebas y build en
verde. La integración continua corre `nx affected`, que valida solo lo tocado y mantiene el
tiempo de feedback bajo.

## Distribución real por sprint

Conteo de commits por rango de fechas, sobre todas las ramas:

| Sprint | Rango | Commits |
|---|---|---|
| 1 | 15-sep → 28-sep | 2 |
| 2 | 29-sep → 12-oct | 7 |
| 3 | 13-oct → 26-oct | 7 |
| 4 | 27-oct → 09-nov | 16 |
| 5 | 10-nov → 23-nov | 8 |

El reparto no es parejo y no pretende serlo. El sprint 1 fue de definición y andamiaje
—poco que commitear, mucho que decidir—, y el sprint 4 concentró la integración de Supabase,
RLS, hub y cuentas. Un equipo de tres personas con dedicación parcial no produce un flujo
constante de commits; produce entregas por funcionalidad.

## Rituales

| Ritual | Frecuencia | Duración | Salida |
|---|---|---|---|
| Sprint Planning | Inicio de sprint | 1 h | Sprint Backlog comprometido |
| Daily | Diario (asíncrono) | 10 min | Bloqueos visibles |
| Refinamiento | Mitad de sprint | 45 min | HU listas (DoR) |
| Sprint Review | Fin de sprint | 45 min | Incremento demostrado |
| Retrospectiva | Fin de sprint | 30 min | Acciones de mejora |

El daily fue asíncrono por escrito: los tres integrantes tenían horarios distintos de trabajo
y estudio. Forzar una reunión diaria sincrónica habría producido asistencia parcial.

## Herramientas

- **Jira (proyecto `ZO`)** — fuente operativa: épicas, HU, tareas, sprints y tablero.
- **Notion** — archivo de descubrimiento y definición inicial. No se sincroniza con Jira:
  Jira manda sobre el estado del trabajo, Notion conserva el contexto de por qué se decidió.
- **GitHub** — código, PRs e integración continua.
- **DeepWiki** — documentación generada desde el código, para que no se desactualice.

## Qué se aprende de este historial

1. **El tamaño del commit no mide el esfuerzo.** Un merge de 20 commits representa semanas
   de una rama; el commit individual en `main` es solo el punto de integración.
2. **La trazabilidad va por funcionalidad.** Los mensajes siguen `tipo(alcance): resumen`
   y referencian el avance del plan (`F6.4`), no el número de issue — una brecha reconocida
   y corregida en `CONTRIBUTING.md`.
3. **La cadencia se mide por entrega, no por commit.** Cinco sprints con incremento
   demostrable valen más que un historial diario de cambios menores.
