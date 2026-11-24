# Sprint 3 — Retrospectiva

**Fecha:** 15 de noviembre de 2026
**Formato:** Start, Stop y Continue

## Datos del sprint

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 182 |
| Puntos completados | 126 |
| Cumplimiento | 69 % |
| HUs arrastradas | 14 (56 puntos) |
| Commits | 22 |
| Impedimentos | 4, tres resueltos |

## Start — comenzar a hacer

1. **Estimar antes de comprometer y no después.** Ocho historias técnicas de este sprint se
   estimaron durante el ordenamiento del 20 de noviembre, cuando ya estaban cerradas. Planificar
   sin estimación equivale a planificar a ciegas, y el sprint se comprometió con 182 puntos sin
   saberlo.
2. **Cerrar una funcionalidad por partes demostrables.** 75 de los 126 puntos se concentraron en un
   solo día (`da98ffb`). Un commit que cierra medio sprint no permite detectar un desvío a mitad de
   camino.
3. **Verificar en el momento y no al final.** Cuatro historias esperaban revisión al cierre. Si la
   revisión ocurre el último día, cualquier hallazgo se convierte en deuda.

## Stop — dejar de hacer

1. **Mezclar caché con datos del usuario.** Provocó pérdida de datos (IMP-08).
2. **Calcular en los componentes.** El doble cálculo de estadísticas (IMP-10) conduce directamente
   a mostrar un número que el motor no produce.
3. **Aceptar un alcance que duplica la capacidad medida del equipo.** La capacidad real rondaba los
   30 puntos por sprint y se comprometieron 182.

## Continue — continuar haciendo

1. **Ejecutar en un Web Worker todo lo que pueda bloquear la interfaz** (IMP-09). El optimizador
   dejó de congelar la pantalla.
2. **Mantener una sola fuente de cálculo.** Los componentes aplican formato y el motor calcula.
3. **Arrastrar sin culpa.** Las 14 historias no se cerraron a la fuerza. Permanecen visibles en el
   Sprint 4 en lugar de marcarse como terminadas.

## Acciones con responsable y fecha

| Acción | Responsable | Fecha | Verificación |
|---|---|---|---|
| Estimar toda historia antes de ingresar al sprint | equipo | desde el Sprint 4 | ninguna historia sin puntos en Jira |
| Verificar dentro del mismo día del cierre | quien cierra la historia | desde el Sprint 4 | cero historias en «En revisión» al cierre |
| No mezclar datos del usuario con caché | backend | permanente | borrar la caché no afecta el inventario |

## Qué se traslada al Sprint 4

| Compromiso | Resultado en el Sprint 4 |
|---|---|
| Estimar antes de ingresar | cumplido: las 16 historias sin puntos se estimaron en el ordenamiento |
| Verificación inmediata | parcial: el Sprint 4 comienza con trabajo en curso y no con revisiones antiguas |
| Alcance realista | no se intentó: el Sprint 4 absorbe 18 historias arrastradas de los sprints 1 a 3 |

## Cierre

El Sprint 3 constituye el punto de inflexión del proyecto. Es donde el producto deja de ser una
demostración y pasa a ser una aplicación. También es donde el equipo aprende que comprometer de más
no acelera nada, y solo cambia la forma en que se mide el fracaso.
