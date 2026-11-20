# Sprint 2 — Retrospectiva

**Fecha:** 1 de noviembre de 2026
**Formato:** Start / Stop / Continue

## Datos del sprint

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 32 |
| Puntos completados | 27 |
| Cumplimiento | 84 % |
| HUs arrastradas | 2 (HUB-34, CFG-02) |
| Impedimentos | 3, todos resueltos |

## Start — empezar a hacer

1. **Usar «En curso» desde el primer día de una HU.** Este sprint no registró ni un solo estado
   intermedio. El resultado es un tablero que no muestra el avance hasta que aparece completo, y
   un evaluador que no puede distinguir «no se empezó» de «está casi».
2. **Cerrar HUs por entregas pequeñas, no por lotes.** 27 de 32 puntos cerraron el último día.
   No es que el trabajo se hiciera ese día: es que hasta ese día no se verificó nada.
3. **Escribir el criterio de aceptación antes de la HU.** Las tres fórmulas de daño funcionaron
   porque el criterio era un número (167,5). Las HUs que se arrastraron no tenían un criterio
   verificable, solo una descripción.

## Stop — dejar de hacer

1. **Mantener el esquema en el panel de Supabase.** Se corrigió en este sprint con
   `supabase/migrations/`; no se vuelve atrás.
2. **Escribir tipos de dominio a mano.** Generados desde el esquema o no existen.
3. **Aceptar «después lo probamos» para RLS.** Una política sin prueba es una suposición; ahora
   la suite falla si se rompe.

## Continue — seguir haciendo

1. **Resolver impedimentos dentro del sprint.** Los tres se cerraron sin arrastrarse.
2. **Concentrar el sprint en lo que desbloquea.** Catálogo, esquema y fórmulas no son pantallas,
   pero sin ellos ninguna pantalla puede funcionar.
3. **Elegir el fallo honesto.** El catálogo vacío en vez de datos de ejemplo: es más incómodo en
   la demo y más correcto en el producto.

## Acciones con responsable y fecha

| Acción | Responsable | Fecha | Verificación |
|---|---|---|---|
| Usar «En curso» en cada HU activa | Equipo | Desde Sprint 3 | Tablero con tarjetas en esa columna |
| No integrar esquema fuera de migraciones | Backend | Permanente | `supabase/migrations/` es la única fuente |
| Toda HU con criterio verificable antes de tomarla | Equipo | Desde Sprint 3 | DoR en `planning.md` del sprint |

## Qué se lleva al siguiente sprint

| Compromiso | Resultado |
|---|---|
| Usar los estados intermedios | Cumplido: el Sprint 3 registró «En curso» y «En revisión» |
| Bajar el tamaño del lote | Parcial: el Sprint 3 concentró más HUs que ningún otro |
| Criterio verificable por HU | Cumplido en las HUs técnicas, no en las de configuración |
