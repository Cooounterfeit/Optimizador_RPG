# Sprint 4 — Retrospectiva (en curso)

**Fecha:** 20 de noviembre de 2026. El sprint cierra el 22 o 23; las acciones se confirman entonces.

## Datos al 20 de noviembre

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 162 |
| Puntos completados | 3 |
| HUs en curso | 7 |
| HUs en revisión | 4 |
| Días hábiles transcurridos | 5 de 10 |
| Impedimentos abiertos | 3 |

## Lo que ya se puede decir

### Funcionó

1. **Poner todo el pendiente en un solo lugar.** El Sprint 4 tiene 39 HUs y se ve enorme, pero no
   hay nada escondido: lo que falta está en el sprint abierto y no en un backlog que nadie mira.
2. **Verificar el despliegue antes de documentarlo.** Primero se marcó como «no verificado», y solo
   después de comprobarlo se escribió que funcionaba (`315df43` → `92596ea`).
3. **La infraestructura dejó de ser un pendiente.** Docker, CI con cobertura, Sonar y auditoría de
   dependencias están hechos y corren en cada PR.

### No funcionó

1. **El sprint mezcla dos cosas.** «Documentación, CI/CD, Docker y demo final» convive con 28 HUs
   que no son de este sprint: 18 arrastradas de los sprints 1 a 3, 9 sin sprint y SP-01. Un sprint
   con dos objetivos distintos no se puede evaluar.
2. **El editor llegó último.** Once HUs de configuración dependían de él y se planificaron después
   de todo lo demás. Eso no es un problema de ritmo: es un problema de orden.
3. **Documentar al final.** La Fase 2 se escribió después de los sprints y hubo que reconstruir
   burndowns y tableros desde los commits. Si se hubiera escrito durante, los datos habrían sido
   mediciones en vez de reconstrucciones.

## Acciones que se confirman al cierre

| Acción | Verificación |
|---|---|
| Cerrar el sprint con una lista explícita de lo que no entra | El backlog del Sprint 4 queda con el pendiente declarado |
| No arrastrar HUs sin empezar al sprint siguiente | Cada una queda en backlog, no en un sprint abierto |
| Escribir la documentación de cada sprint dentro del sprint | Burndown medido, no reconstruido |

## Lo que este sprint deja al proyecto

Un producto que se sostiene sin la demo es lo único que separa una entrega de una presentación. Al
20 de noviembre, ese paso está empezado: el editor existe (`5c4cbe7`) y la demo hardcodeada todavía
no se eliminó. El sprint se juega en TEC-22.
