# Sprint 4 — Impedimentos

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad (abierto)

**Origen.** Sprint 3. Se planificaron 182 puntos con una capacidad observada de unos 30 por sprint.

**Consecuencia en este sprint.** 28 historias llegadas del ordenamiento conviven con las 11 propias
del cierre: 18 arrastradas de los sprints 1 a 3, 9 que no tenían sprint y SP-01. El Sprint 4 no
puede cumplir su objetivo declarado, que abarca documentación, CI/CD, Docker y demo final, sin
decidir qué queda fuera.

**Estado.** Abierto. No se resuelve moviendo tarjetas. Se resuelve cerrando el sprint con una lista
explícita de lo que no ingresa.

## IMP-12 — El producto depende de un juego demo escrito a mano (aceptado)

**Problema.** Parte de la interfaz y de los datos semilla se apoyan en un juego hardcodeado en el
bundle. La aplicación no se puede utilizar con un juego propio sin modificar código.

**Por qué se acepta.** Para el Capstone, esto no constituye un defecto sino la evidencia. La demo
demuestra que el motor resuelve el problema con un juego real. Sin ella habría que presentar el
motor de forma aislada.

**Qué se mantiene igual.** TEC-23, que redirige las rutas antiguas, y UI-01, que unifica la
interfaz, siguen en el sprint. Ninguna depende de retirar la demo y ambas mejoran lo que se
presenta.

**Estado.** Aceptado y no resuelto. TEC-22 queda para después del Capstone, junto con el registro de
juegos por parte del usuario.

## IMP-13 — Dos interfaces de optimizador vigentes a la vez

**Problema.** Conviven la versión antigua y la nueva del optimizador. Cada cambio debe aplicarse dos
veces y las pruebas cubren solo una.

**Resolución prevista.** UI-01, dentro de este sprint.

**Estado.** Abierto.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-11 | Sprint 3 sobrecomprometido, con 28 historias llegadas del ordenamiento | abierto |
| IMP-12 | juego demo hardcodeado en el bundle | aceptado (posterior al Capstone) |
| IMP-13 | dos interfaces de optimizador | abierto, previsto para UI-01 |

Ninguno se cierra con documentación. IMP-11 exige un sprint con alcance realista, IMP-12 se acepta
hasta el Capstone y IMP-13 requiere código, mediante UI-01.
