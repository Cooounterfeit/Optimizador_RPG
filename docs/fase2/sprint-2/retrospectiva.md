# Sprint 2 — Retrospectiva

**Fecha:** 1 de noviembre de 2026
**Formato:** Start, Stop y Continue

## Datos del sprint

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 32 |
| Puntos completados | 27 |
| Cumplimiento | 84 % |
| HUs arrastradas | 2 (HUB-34, CFG-02) |
| Impedimentos | 3, todos resueltos |

## Start — comenzar a hacer

1. **Usar «En curso» desde el primer día de una historia.** Este sprint no registró ningún estado
   intermedio. El resultado es un tablero que no muestra el avance hasta que aparece completo, y un
   evaluador que no puede distinguir entre «no se comenzó» y «está casi terminado».
2. **Cerrar historias por entregas pequeñas y no por lotes.** 27 de 32 puntos cerraron el último
   día. El trabajo no se realizó ese día; hasta entonces no se verificó nada.
3. **Escribir el criterio de aceptación antes de la historia.** Las tres fórmulas de daño
   funcionaron porque el criterio era un número (167,5). Las historias que se arrastraron no tenían
   un criterio verificable, solo una descripción.

## Stop — dejar de hacer

1. **Mantener el esquema en el panel de Supabase.** Se corrigió en este sprint con
   `supabase/migrations/` y no se vuelve atrás.
2. **Escribir tipos de dominio a mano.** Se generan desde el esquema o no existen.
3. **Aceptar «después lo probamos» para RLS.** Una política sin prueba es una suposición. Ahora la
   suite falla si se rompe.

## Continue — continuar haciendo

1. **Resolver impedimentos dentro del sprint.** Los tres se cerraron sin arrastrarse.
2. **Concentrar el sprint en lo que desbloquea.** Catálogo, esquema y fórmulas no son pantallas,
   pero sin ellos ninguna pantalla puede funcionar.
3. **Elegir el fallo honesto.** El catálogo vacío en lugar de datos de ejemplo resulta más incómodo
   en la demostración y más correcto en el producto.

## Acciones con responsable y fecha

| Acción | Responsable | Fecha | Verificación |
|---|---|---|---|
| Usar «En curso» en cada historia activa | equipo | desde Sprint 3 | tablero con tarjetas en esa columna |
| No integrar esquema fuera de migraciones | backend | permanente | `supabase/migrations/` como única fuente |
| Toda historia con criterio verificable antes de tomarla | equipo | desde Sprint 3 | DoR en `planning.md` del sprint |

## Qué se traslada al sprint siguiente

| Compromiso | Resultado |
|---|---|
| Usar los estados intermedios | cumplido: el Sprint 3 registró «En curso» y «En revisión» |
| Reducir el tamaño del lote | parcial: el Sprint 3 concentró más historias que ningún otro |
| Criterio verificable por historia | cumplido en las historias técnicas, no en las de configuración |
