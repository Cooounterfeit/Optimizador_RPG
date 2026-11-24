# Sprint 4 — Retrospectiva

**Fecha de la sesión:** 20 de noviembre de 2026. El sprint cerró el 23 a medianoche, y las acciones
de cierre se confirman contra el estado de Jira.

> **Alcance de este documento.** La sesión se realizó el 20 de noviembre, con 5 de los 6 días
> hábiles transcurridos. Lo siguiente corresponde a lo que se dijo en esa sesión y no a una
> reconstrucción posterior. Al cierre se agrega lo que el repositorio permite verificar. Lo que
> depende de Jira no se inventa.

## Datos al 20 de noviembre

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 162 |
| Puntos completados | 3 |
| HUs en curso | 7 |
| HUs en revisión | 4 |
| Días hábiles transcurridos | 5 de 6 |
| Impedimentos abiertos | 3 |

## Lo que puede afirmarse

### Funcionó

1. **Reunir todo el pendiente en un solo lugar.** El Sprint 4 tiene 39 historias y parece enorme,
   pero no esconde nada. Lo que falta está en el sprint abierto y no en un backlog que nadie
   consulta.
2. **Verificar el despliegue antes de documentarlo.** Primero se marcó como «no verificado» y solo
   después de comprobarlo se escribió que funcionaba (`315df43` → `92596ea`).
3. **La infraestructura dejó de ser un pendiente.** Docker, CI con cobertura, Sonar y auditoría de
   dependencias están terminados y se ejecutan en cada pull request.

### No funcionó

1. **El sprint mezcla dos propósitos.** «Documentación, CI/CD, Docker y demo final» convive con 28
   historias que no pertenecen a este sprint: 18 arrastradas de los sprints 1 a 3, 9 sin sprint y
   SP-01. Un sprint con dos objetivos distintos no puede evaluarse.
2. **El editor llegó último.** Once historias de configuración dependían de él y se planificaron
   después de todo lo demás. No es un problema de ritmo, sino de orden.
3. **Documentar al final.** La Fase 2 se escribió después de los sprints y hubo que reconstruir
   burndowns y tableros desde los commits. Si se hubiera escrito durante el trabajo, los datos
   habrían sido mediciones y no reconstrucciones.

## Acciones que se confirman al cierre

| Acción | Verificación |
|---|---|
| Cerrar el sprint con una lista explícita de lo que no ingresa | el backlog del Sprint 4 queda con el pendiente declarado |
| No arrastrar historias sin iniciar al sprint siguiente | cada una queda en backlog y no en un sprint abierto |
| Escribir la documentación de cada sprint dentro del sprint | burndown medido y no reconstruido |

## Lo que este sprint deja al proyecto

El paso que separaba una entrega de una presentación consistía en retirar la demo del bundle. Se
decidió lo contrario, y es correcto: la demo es la presentación. Lo que permanece abierto es el
editor, que es lo que permite que la demo deje de ser un caso único.

## Cierre, 23 de noviembre

De las tres acciones, la primera ya está aplicada. El pendiente quedó declarado en el backlog y en
el informe final, sin marcarlo como terminado. La tercera también, porque la documentación se
escribió dentro de los sprints y este sprint se reconstruyó contra Jira y contra los commits.

La segunda mitad del objetivo del sprint sí se cumplió y puede verificarse. El editor dejó de ser
una intención. Al cierre existen CFG-05 completo (`17d444e`, `013e8b3`), CFG-06 (`6cff5b7`) y CFG-01
(`cec1a57`), y la suite completa pasa con **700 casos unitarios y de integración más 27 recorridos
de extremo a extremo**. El 22 de noviembre, un domingo, ingresaron diez commits con el editor. El
sprint no terminó por falta de trabajo.

Lo que no se cumplió es la relación entre lo comprometido y lo entregado. Fueron 162 puntos
comprometidos frente a un sprint que comenzó con 28 historias llegadas de afuera el día 20. Esa
constituye la lección que el proyecto se lleva, y quedó escrita en las conclusiones del informe
final.
