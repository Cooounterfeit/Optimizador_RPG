# Sprint 4 — Impedimentos

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad (abierto)

**Origen.** Sprint 3. Se planificaron 182 puntos con una capacidad observada de ~30 por sprint.

**Consecuencia en este sprint.** 28 HUs llegadas del ordenamiento conviven con las 11 propias del
cierre: 18 arrastradas de los sprints 1 a 3, 9 que no tenían sprint y SP-01. El Sprint 4 no puede
cumplir su objetivo declarado —documentación, CI/CD, Docker y demo final— sin decidir qué queda
fuera.

**Estado.** **Abierto.** No se resuelve moviendo tarjetas: se resuelve cerrando el sprint con una
lista explícita de lo que no entra.

## IMP-12 — El producto depende de un juego demo escrito a mano (aceptado)

**Problema.** Parte de la interfaz y de los datos semilla se apoyan en un juego hardcodeado en el
bundle. La aplicación no se puede usar con un juego propio sin tocar código.

**Por qué se acepta.** Para el Capstone eso **no es un defecto: es la evidencia**. La demo
demuestra que el motor resuelve el problema con un juego real; sin ella habría que presentar el
motor aislado.

**Qué se hace igual.** TEC-23 (redirigir las rutas viejas) y UI-01 (unificar la interfaz) siguen en
el sprint: no dependen de sacar la demo y sí mejoran lo que se presenta.

**Estado.** **Aceptado, no resuelto.** TEC-22 queda para después del Capstone, junto con el registro
de juegos por el usuario.

## IMP-13 — Dos interfaces de optimizador vivas a la vez

**Problema.** Conviven la versión vieja y la nueva del optimizador. Cada cambio hay que hacerlo dos
veces y las pruebas cubren una sola.

**Resolución prevista.** UI-01, dentro de este sprint.

**Estado.** **Abierto**.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-11 | Sprint 3 sobrecomprometido, 28 HUs llegadas del ordenamiento | Abierto |
| IMP-12 | Juego demo hardcodeado en el bundle | Aceptado (post-Capstone) |
| IMP-13 | Dos interfaces de optimizador | Abierto, previsto para UI-01 |

Ninguno se cierra con documentación: IMP-11 pide un sprint con alcance realista, IMP-12 se acepta
hasta el Capstone y IMP-13 es código (UI-01).
