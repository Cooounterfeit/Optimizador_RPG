# Sprint 1 — Burndown

![Burndown del Sprint 1](./burndown.png)

> **Gráfico reconstruido.** El sprint permaneció en estado `future` en Jira durante todo el trabajo
> y se cerró recién el 20 de noviembre de 2026, al ordenar el proyecto. Jira no guarda historial de
> puntos por día con esa secuencia, así que la curva se reconstruye desde las fechas de commit y el
> estado final de cada HU. Se declara explícitamente para no presentar como medición lo que es una
> estimación.

## Método de reconstrucción

1. Se toma la fecha del commit que evidencia cada HU.
2. Cada día se descuentan los puntos de las HUs cuyo primer commit aparece ese día o antes.
3. La línea ideal reparte 35 puntos entre los **10 días hábiles** del sprint (5 al 16 de octubre).

## Tabla

| Día | Ideal restante | Real restante | HUs que cierran |
|---|---|---|---|
| 05 oct | 35,0 | 35 | — |
| 06 oct | 31,1 | 35 | bootstrap y demo: sin puntos de HU |
| 07 oct | 27,2 | 35 | — |
| 08 oct | 23,3 | 35 | — |
| 09 oct | 19,4 | 35 | — |
| 12 oct | 15,6 | **19** | TEC-10, TEC-12, DPG-01 a DPG-05 (−16) |
| 13 oct | 11,7 | 19 | Supabase, sin cierre de HU |
| 14 oct | 7,8 | 19 | — |
| 15 oct | 3,9 | 19 | — |
| 16 oct | 0,0 | **9** | AUT-1, AUT-2, INV-8 (−10) |
| 18 oct | 0,0 | **6** | SP-02 (−3) |

## Aritmética del cierre

```
Comprometido          35 pts
Cerrado en el sprint  29 pts  (TEC-10, TEC-12, DPG-01…05, AUT-1, AUT-2, INV-8, SP-02)
Abierto al cierre      6 pts  (CFG-05, CFG-06)
Cumplimiento          29 / 35 = 83 %
```

## Lectura

- **La curva es escalonada, no diagonal.** Cinco días sin cierre y dos caídas netas (12 y 16 de
  octubre). Es el patrón de trabajo concentrado en sesiones, no de dedicación diaria pareja.
- **Termina 6 puntos por encima de la línea ideal**, que son exactamente las dos HUs trasladadas
  al Sprint 2. No hay desvío no explicado: todo punto abierto tiene destino.
- **El hueco no creció a mitad de sprint.** La distancia con el ideal pasó de ~16 puntos el 12 de
  octubre a 6 al cierre: el trabajo aceleró al final, no se estancó.

## Límite del dato

Jira registra SP-02 como `Done` pero **no guarda la fecha de la transición**, así que el paso de
9 a 6 puntos no se puede ubicar en un día concreto. Se dibuja en el cierre porque es lo único
verificable. Los otros dos escalones sí tienen fecha de commit.

## Datos que respaldan la curva

```
2026-10-06  chore/bootstrap monorepo (#1)
2026-10-06  feat(demo): prototipo v2 con niveles, habilidades y Supabase (#2)
2026-10-12  feat(core-engine): motor portado desde el prototipo con pruebas
2026-10-12  feat(shared-types): contrato de juego completo con Zod
2026-10-13  sql_supabase, vercel.json, evidencia Fase 2
```
