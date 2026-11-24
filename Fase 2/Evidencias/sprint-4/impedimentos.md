# Sprint 4 — Impedimentos

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad (cerrado)

**Origen.** Sprint 3. Se planificaron 182 puntos con una capacidad observada de unos 30 por sprint.

**Consecuencia.** El Sprint 4 recibió 28 historias del ordenamiento del 20 de noviembre: 18
arrastradas de los sprints 1 a 3, 9 sin sprint y SP-01.

**Cómo se cerró.** Con una lista explícita de lo que no ingresa. El backlog del Sprint 4 declara las
19 historias que quedan fuera y por qué, sin arrastrarlas al sprint siguiente ni marcarlas como
hechas.

**Estado.** Cerrado el 23 de noviembre.

## IMP-12 — El producto depende de un juego demo escrito a mano (aceptado)

**Problema.** Parte de la interfaz y de los datos semilla se apoyan en un juego hardcodeado en el
bundle. La aplicación no se puede utilizar con un juego propio sin modificar código.

**Por qué se acepta.** Para el Capstone, esto no constituye un defecto sino la evidencia. La demo
demuestra que el motor resuelve el problema con un juego real.

**Qué cambió desde el 20 de noviembre.** CFG-22 y TEC-27 reducen el problema sin eliminarlo. El
autor de un optimizador ya puede estrenar un juego al guardarlo, y el catálogo quedó normalizado con
géneros. La demo sigue siendo el juego de ejemplo.

**Estado.** Aceptado. TEC-22 queda para después del Capstone.

## IMP-13 — Dos interfaces de optimizador vigentes a la vez (cerrado)

**Problema.** Convivián la versión antigua y la nueva del optimizador. Cada cambio debía aplicarse
dos veces y las pruebas cubrían solo una.

**Cómo se cerró.** UI-01 dejó una sola interfaz montada. El router solo expone `OptimizerWorkspace`,
y la página antigua quedó como sección del workspace en lugar de ruta propia.

**Verificación.** `apps/web/src/app/router.tsx` declara `optimizer/:id/*` como única ruta del
optimizador. `sections.ts` monta las secciones dentro del workspace.

**Estado.** Cerrado el 23 de noviembre.

## IMP-14 — El trabajo sin historia no existe para Jira (abierto)

**Problema.** SonarQube, Docker, el pipeline de integración continua, la reescritura de la
documentación, el catálogo normalizado, el guardado en la cuenta y el arreglo de fixtures se
hicieron sin historia que los respaldara. Siete tareas, 34 puntos de trabajo real.

**Consecuencia.** Al cerrar hubo que crearlas hacia atrás. La única prueba de que se hicieron es el
commit, no una tarjeta con criterios de aceptación escritos antes de empezar.

**Por qué importa.** Un evaluador que mire solo el tablero vería 39 historias y no 46. La diferencia
es trabajo que existió y no estaba declarado.

**Cómo se resuelve.** Creando la historia antes de empezar el trabajo. No es un problema de
herramienta: es un hábito.

**Estado.** Abierto. Se anota como lección para la siguiente etapa del proyecto.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-11 | Sprint 3 sobrecomprometido con 28 historias llegadas del ordenamiento | **cerrado** |
| IMP-12 | juego demo hardcodeado en el bundle | aceptado (posterior al Capstone) |
| IMP-13 | dos interfaces de optimizador | **cerrado** |
| IMP-14 | trabajo real sin historia en Jira | abierto |

De los cuatro, dos se cerraron con código y uno con una decisión de alcance. El cuarto no se cierra
con documentación: exige cambiar un hábito de trabajo.
