# Sprint 3 — Retrospectiva

**Fecha:** 15 de noviembre de 2026
**Formato:** Start / Stop / Continue

## Datos del sprint

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 182 |
| Puntos completados | 126 |
| Cumplimiento | 69 % |
| HUs arrastradas | 14 (56 puntos) |
| Commits | 22 |
| Impedimentos | 4, tres resueltos |

## Start — empezar a hacer

1. **Estimar antes de comprometer, no después.** Ocho HUs técnicas de este sprint se estimaron
   durante el ordenamiento del 20 de noviembre, cuando ya estaban cerradas. Planificar sin
   estimación es planificar a ciegas: el sprint se comprometió con 182 puntos sin saberlo.
2. **Cerrar una funcionalidad por partes demostrables.** 75 de los 126 puntos cayeron en un solo
   día (`da98ffb`). Un commit que cierra medio sprint no permite detectar un desvío a mitad de
   camino.
3. **Verificar en el momento, no al final.** Cuatro HUs esperaban revisión al cierre. Si la
   revisión ocurre el último día, cualquier hallazgo se convierte en deuda.

## Stop — dejar de hacer

1. **Mezclar caché con datos del usuario.** Causó pérdida de datos (IMP-08).
2. **Calcular en los componentes.** El doble cálculo de estadísticas (IMP-10) es el camino directo
   a mostrar un número que el motor no produce.
3. **Aceptar un alcance que duplica la capacidad medida del equipo.** La capacidad real era ~30
   puntos por sprint; se comprometieron 182.

## Continue — seguir haciendo

1. **Trabajar en un Web Worker lo que pueda bloquear la interfaz** (IMP-09). El optimizador dejó de
   congelar la pantalla.
2. **Una sola fuente de cálculo.** Componentes que formatean, motor que calcula.
3. **Arrastrar sin culpa.** Las 14 HUs no se cerraron a la fuerza: quedaron visibles en el Sprint 4
   en lugar de marcarse como terminadas.

## Acciones con responsable y fecha

| Acción | Responsable | Fecha | Verificación |
|---|---|---|---|
| Estimar toda HU antes de entrar al sprint | Equipo | Desde el Sprint 4 | Ninguna HU sin puntos en Jira |
| Verificar dentro del mismo día del cierre | Quien cierra la HU | Desde el Sprint 4 | Cero HUs en «En revisión» al cierre |
| No mezclar datos del usuario con caché | Backend | Permanente | Borrar caché no afecta el inventario |

## Qué se lleva al Sprint 4

| Compromiso | Resultado en el Sprint 4 |
|---|---|
| Estimar antes de entrar | Cumplido: las 16 HUs sin puntos se estimaron en el ordenamiento |
| Verificación inmediata | Parcial: el Sprint 4 arranca con trabajo en curso, no con revisiones viejas |
| Alcance realista | No se intentó: el Sprint 4 absorbe las 28 HUs pendientes de los sprints 2 y 3 |

## Cierre

El Sprint 3 es el punto de inflexión del proyecto: es donde el producto deja de ser una demo y
pasa a ser una aplicación. También es donde el equipo aprende que **comprometer de más no acelera
nada**; solo cambia la forma en que se mide el fracaso.
