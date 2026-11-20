# Sprint 3 — Impedimentos

## IMP-08 — Limpiar la caché borraba el inventario

**Problema.** El almacenamiento local mezclaba datos descargados del servidor con datos propios del
jugador. Al invalidar la caché se perdía el inventario, sin aviso.

**Impacto.** Pérdida de datos del usuario. Es el tipo de fallo que no se nota en una demo y sí en
uso real.

**Resolución.** `020a31a`. `games` pasa a ser caché y los datos del jugador se borran por una
operación explícita, distinta de «refrescar».

## IMP-09 — El optimizador bloqueaba la interfaz

**Problema.** La búsqueda de la mejor build corre sobre el hilo principal. Con muchas
combinaciones, la UI se congela y el usuario no sabe si falló.

**Resolución.** Se mueve a un Web Worker (`optimizer.worker.ts`) con límite de tiempo en segundos
(`d66d4f7`) y clave de caché por contenido real de la entrada. El mismo perfil con el mismo
inventario no se recalcula.

## IMP-10 — Las estadísticas mostradas no coincidían con el cálculo

**Problema.** La hoja de personaje mostraba números calculados en el componente, mientras el
optimizador usaba el motor. Dos fórmulas para el mismo dato: divergen en el primer cambio.

**Resolución.** `f803d2f`. Todo número mostrado sale de la misma función del motor; el componente
solo formatea.

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad

**Problema.** 39 HUs y 182 puntos para diez días hábiles, cuando el sprint anterior había
entregado 27 puntos.

**Impacto.** El cumplimiento cayó al 69 % y catorce HUs se arrastraron al Sprint 4.

**Resolución.** No se cerró dentro del sprint. Se reconoce en la retrospectiva: el alcance se
ajustó al terminar, no al planificar.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-08 | Caché y datos del jugador mezclados | Resuelto |
| IMP-09 | Optimizador bloqueante | Resuelto |
| IMP-10 | Doble cálculo de estadísticas | Resuelto |
| IMP-11 | Sprint sobrecomprometido | **Abierto**, se arrastra al Sprint 4 |
