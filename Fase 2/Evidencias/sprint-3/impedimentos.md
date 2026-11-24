# Sprint 3 — Impedimentos

## IMP-08 — Limpiar la caché borraba el inventario

**Problema.** El almacenamiento local mezclaba datos descargados del servidor con datos propios del
jugador. Al invalidar la caché se perdía el inventario, sin aviso.

**Impacto.** Pérdida de datos del usuario. Es el tipo de fallo que no se advierte en una
demostración y sí en uso real.

**Resolución.** Commit `020a31a`. `games` pasa a funcionar como caché, y los datos del jugador se
eliminan mediante una operación explícita y distinta de «refrescar».

## IMP-09 — El optimizador bloqueaba la interfaz

**Problema.** La búsqueda de la mejor build se ejecutaba sobre el hilo principal. Con muchas
combinaciones, la interfaz se congelaba y el usuario no podía distinguir si había fallado.

**Resolución.** Se traslada a un Web Worker (`optimizer.worker.ts`), con límite de tiempo en
segundos (`d66d4f7`) y clave de caché por contenido real de la entrada. El mismo perfil con el
mismo inventario no se recalcula.

## IMP-10 — Las estadísticas mostradas no coincidían con el cálculo

**Problema.** La hoja de personaje mostraba números calculados en el componente, mientras el
optimizador utilizaba el motor. Dos fórmulas para el mismo dato divergen en el primer cambio.

**Resolución.** Commit `f803d2f`. Todo número mostrado proviene de la misma función del motor, y el
componente solo aplica formato.

## IMP-11 — El Sprint 3 se comprometió al doble de capacidad

**Problema.** 39 historias y 182 puntos para diez días hábiles, cuando el sprint anterior había
entregado 27 puntos.

**Impacto.** El cumplimiento cayó al 69 % y catorce historias se arrastraron al Sprint 4.

**Resolución.** No se cerró dentro del sprint. Se reconoce en la retrospectiva: el alcance se
ajustó al terminar y no al planificar.

## Resumen

| ID | Impedimento | Estado |
|---|---|---|
| IMP-08 | caché y datos del jugador mezclados | resuelto |
| IMP-09 | optimizador bloqueante | resuelto |
| IMP-10 | doble cálculo de estadísticas | resuelto |
| IMP-11 | sprint sobrecomprometido | **abierto**, se arrastra al Sprint 4 |
