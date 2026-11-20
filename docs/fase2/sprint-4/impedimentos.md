# Sprint 4 — Impedimentos

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad (abierto)

**Origen.** Sprint 3. Se planificaron 182 puntos con una capacidad observada de ~30 por sprint.

**Consecuencia en este sprint.** 28 HUs arrastradas conviven con las 11 propias del cierre. El
Sprint 4 no puede cumplir su objetivo declarado —documentación, CI/CD y demo final— sin decidir qué
queda fuera.

**Estado.** **Abierto.** No se resuelve moviendo tarjetas: se resuelve cerrando el sprint con una
lista explícita de lo que no entra.

## IMP-12 — El producto depende de un juego de demostración escrito a mano

**Problema.** Parte de la interfaz y de los datos semilla siguen apoyados en un juego hardcodeado
en el bundle. Mientras esté ahí, la aplicación no se puede usar con un juego propio sin tocar
código.

**Impacto.** Es el impedimento que decide si el producto existe. Un optimizador que solo funciona
con el juego del ejemplo es una demo, no una herramienta.

**Mitigación en curso.** TEC-22 (eliminar el juego demo hardcodeado), TEC-23 (redirigir las rutas
viejas), UI-01 (unificar la interfaz del optimizador) y el editor de juegos, que es lo que ocupa la
columna «En curso».

**Estado.** **Abierto**, con trabajo en marcha.

## IMP-13 — Dos interfaces de optimizador vivas a la vez

**Problema.** Conviven la versión vieja y la nueva del optimizador. Cada cambio hay que hacerlo dos
veces y las pruebas cubren una sola.

**Resolución prevista.** UI-01, dentro de este sprint.

**Estado.** **Abierto**.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-11 | Sprint 3 sobrecomprometido, arrastre de 28 HUs | Abierto |
| IMP-12 | Juego demo hardcodeado en el bundle | Abierto, en trabajo |
| IMP-13 | Dos interfaces de optimizador | Abierto, previsto para UI-01 |

Ninguno de los tres se puede cerrar con documentación. Los tres son código.
