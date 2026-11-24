# Sprint 4 — Retrospectiva

**Sesión:** 20 de noviembre de 2026, con el sprint abierto.
**Cierre:** 23 de noviembre. Lo que sigue distingue lo dicho en la sesión de lo verificado al cerrar.

## Datos al cierre

| Indicador | Al abrir | Al cerrar |
|---|---|---|
| Puntos comprometidos | 162 | 196 |
| Puntos completados | 3 | 79 |
| HUs cerradas | 1 | 20 |
| HUs en curso | 7 | 7 |
| Días hábiles | 5 de 6 | 6 de 6 |

## Lo que funcionó

1. **Reunir todo el pendiente en un solo lugar.** El Sprint 4 tiene 46 historias y parece enorme,
   pero no esconde nada. Lo que falta está en el sprint abierto y no en un backlog que nadie
   consulta.

2. **Verificar antes de documentar.** El despliegue se declaró «no verificado» y solo después de
   comprobarlo se escribió que funcionaba. La misma regla se aplicó al cierre: cada historia
   marcada como «Listo» tiene un commit que la respalda.

3. **La hackatón del 22 y 23.** Dos jornadas presenciales cerraron el 75 % de lo que se cerró en
   todo el sprint. Lo que por chat llevaba semanas se resolvió trabajando juntos.

4. **Crear las historias que faltaban.** Siete tareas de trabajo real no existían en Jira. Se
   crearon, se estimaron y se cerraron. La alternativa era dejarlas invisibles y presentar un
   sprint con mejor porcentaje y peor trazabilidad.

5. **La infraestructura dejó de ser un pendiente.** Docker, integración continua, SonarQube y
   auditoría de dependencias están terminados y se ejecutan en cada pull request.

## Lo que no funcionó

1. **El sprint mezcla dos propósitos.** «Documentación, CI/CD, Docker y demo final» convive con 28
   historias que no pertenecen a este sprint. Un sprint con dos objetivos distintos no puede
   evaluarse por un solo número.

2. **El editor llegó último.** Dieciocho historias de configuración dependían de él y se
   planificaron después de todo lo demás. No es un problema de ritmo, sino de orden.

3. **Documentar al final.** La Fase 2 se escribió después de los sprints y hubo que reconstruir
   burndowns y tableros desde los commits. Si se hubiera escrito durante el trabajo, los datos
   habrían sido mediciones y no reconstrucciones.

4. **El trabajo sin tarjeta es trabajo invisible.** SonarQube, Docker, el pipeline y la
   documentación se hicieron sin historia que los respaldara. Al cierre hubo que crearlas hacia
   atrás, con la evidencia del commit como única prueba.

## Acciones

| Acción | Verificación al cierre |
|---|---|
| Cerrar el sprint con una lista explícita de lo que no ingresa | cumplida: el backlog queda con el pendiente declarado |
| No arrastrar historias sin iniciar al sprint siguiente | cumplida: cada una queda en backlog |
| Escribir la documentación de cada sprint dentro del sprint | cumplida: se escribió dentro de los sprints |
| Crear la historia antes de empezar el trabajo | **no cumplida**: las siete tareas de infraestructura se crearon al cerrar |

La cuarta acción nace de este sprint y no se cumplió en este sprint. Es la lección que queda para
la siguiente etapa del proyecto.

## Lo que este sprint deja

El paso que separaba una entrega de una presentación consistía en retirar la demo del bundle. Se
decidió lo contrario, y es correcto: la demo es la presentación.

Lo que permanece abierto es el editor de variables, que es lo que permite que la demo deje de ser un
caso único. No se alcanzó, y se declara como tal.

## Cierre, 23 de noviembre

De las cuatro acciones, tres están aplicadas. La cuarta no, y se anota como deuda de proceso.

El objetivo del sprint se cumplió: documentación, integración continua, Docker y demo final. El
editor de atributos quedó operativo, con seis historias cerradas y verificadas.

Lo que no se cumplió es la relación entre lo comprometido y lo entregado. Fueron 196 puntos
comprometidos, de los cuales 34 llegaron después de abrir el sprint, frente a 79 cerrados. Esa
constituye la lección que el proyecto se lleva.

## Impresiones de la sesión

Las tres personas coincidieron en dos puntos.

**La coordinación por chat tiene un costo medible.** El avance no deja rastro hasta que se convierte
en código. Un sprint con cadencia diaria habría mostrado la curva real; este mostró escalones.

**La hackatón cambió el sprint.** Lo que en octubre era una idea que el equipo miraba con reservas
terminó siendo la forma en que el proyecto llegó terminado a la entrega. Se acordó repetirla en las
últimas semanas de cualquier proyecto que siga.
