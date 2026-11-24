# Documentación de la Fase 2

Registro de los cuatro sprints del proyecto, en el orden en que ocurrieron. Cada sprint contiene los
mismos nueve documentos, de modo que puedan compararse sin búsquedas adicionales.

## Alcance: entrega Capstone

Esta documentación corresponde a la entrega Capstone, la versión universitaria que se presenta como
**Optimizador RPG**. No constituye la documentación del producto final.

Cuando el proyecto continúe fuera de la facultad como **Zenith Optimizer**, buena parte de este
contenido quedará desactualizado: nombres, alcance, sprints, decisiones y capturas. Se conserva tal
como está porque registra lo ocurrido en esas fechas, y reescribirlo después lo convertiría en una
ficción. Lo que se construya a partir de la versión final tendrá su propia documentación, en otra
sección, y no heredará estas cifras.

En concreto, cuando el producto cambie de etapa:

- Estos sprints no se reabren ni se recalculan: constituyen el registro del Capstone.
- Las decisiones de arquitectura de `docs/decisiones/` siguen vigentes solo hasta que un ADR nuevo
  las reemplace, según la regla de esa carpeta.
- Las capturas de `demo/` muestran el prototipo del Capstone y no el producto publicado.

**Fuente de los datos.** Jira, proyecto `ZO`. Los sprints 1 a 3 se verificaron contra la API el 20
de noviembre de 2026. El Sprint 4 cerró el 23 a medianoche, y su tabla conserva esa misma foto. La
evidencia de código al cierre se documenta en
[`sprint-4/backlog.md`](./sprint-4/backlog.md).

## Los cuatro sprints

| Sprint | Fechas | HUs | Puntos | Cerrados | Cumplimiento |
|---|---|---|---|---|---|
| [1 — Prototipo y motor](./sprint-1/planning.md) | 05-oct → 18-oct | 13 | 35 | 29 | **83 %** |
| [2 — Catálogo y RLS](./sprint-2/planning.md) | 19-oct → 01-nov | 9 | 32 | 27 | **84 %** |
| [3 — App real e inventario](./sprint-3/planning.md) | 02-nov → 15-nov | 39 | 182 | 126 | **69 %** |
| [4 — Cierre y entrega](./sprint-4/planning.md) | 16-nov → 23-nov | 39 | 162 | 3 | al cierre |

> En los sprints 1 a 3, las historias que no se cerraron se arrastraron al Sprint 4 al cerrar cada
> sprint. Fueron 2 del Sprint 1, 2 del Sprint 2 y 14 del Sprint 3. A esas 18 se sumaron, en el
> ordenamiento del 20 de noviembre, 9 historias sin sprint y SP-01, que volvió desde el Sprint 0.
> Por esta razón el Sprint 4 tiene 39 historias: 11 propias y 28 llegadas de afuera.
>
> **Los totales de los cuatro sprints no se suman.** Sumar 13, 9, 39 y 39 da 100, pero el proyecto
> tiene **83 historias y 332 puntos**. El Sprint 4 incluye trabajo ya contado en los sprints
> anteriores. El total del proyecto, y no la suma de la columna, es el número que corresponde citar.

Jira incluye además un **Sprint 0 — Arranque del repositorio** (02-sep → 16-sep), con una sola
historia: SP-01, evaluación de monorepos. No se documenta como sprint porque no hubo iteración.
Fue la decisión de arranque, y esa historia se cerró recién en el Sprint 4.

## Documentos de cada sprint

| Documento | Qué responde |
|---|---|
| [`planning.md`](./sprint-1/planning.md) | qué se comprometió, con qué criterio y qué riesgos |
| [`backlog.md`](./sprint-1/backlog.md) | cada historia con puntos, estado y evidencia en el código |
| [`scrumboard.md`](./sprint-1/scrumboard.md) | cómo se veía el tablero y qué indica sobre la forma de trabajar |
| [`burndown.md`](./sprint-1/burndown.md) | puntos por día y modo de reconstrucción |
| [`daily.md`](./sprint-1/daily.md) | qué ocurrió cada día, derivado de los commits |
| [`impedimentos.md`](./sprint-1/impedimentos.md) | qué bloqueó y cómo se resolvió |
| [`release.md`](./sprint-1/release.md) | qué ingresó a `main` y cómo verificarlo |
| [`review.md`](./sprint-1/review.md) | qué se demostró y qué no, con el motivo |
| [`retrospectiva.md`](./sprint-1/retrospectiva.md) | qué se inicia, qué se deja y qué se continúa |

## Cadencia

La daily es asíncrona y escrita, con una duración de 2 a 15 minutos y cierre inmediato cuando no
existen cambios ni bloqueos. Consulte el [ADR 006](../decisiones/006-cadencia-daily.md).

El [`registro-cadencia.md`](./registro-cadencia.md) contiene una fila por día hábil, incluidas las
jornadas sin actividad. Cada entrada incluye el commit que la respalda o la declaración de que no
existe.

## Releases por sprint

Cada sprint cerrado tiene un tag anotado en GitHub sobre el último commit de su ventana. El mensaje
del tag resume el incremento:

| Sprint | Tag | Commit | Enlace |
|---|---|---|---|
| 1 — Prototipo y motor | `sprint-1` | `8c78dd5` | [releases/tag/sprint-1](https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-1) |
| 2 — Catálogo y RLS | `sprint-2` | `17044c6` | [releases/tag/sprint-2](https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-2) |
| 3 — App real e inventario | `sprint-3` | `c98ce2c` | [releases/tag/sprint-3](https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-3) |
| 4 — Cierre y entrega | `sprint-4` | tag de cierre | [releases/tag/sprint-4](https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-4) |

El proyecto no utiliza versiones semánticas del tipo `v1.2.3`. Versiona por sprint, que es lo que el
listado de documentos solicita como entregable de Release. Para consultar el código exacto que se
entregó en el Sprint 1:

```bash
git checkout sprint-1
```

## Reglas que siguen estos documentos

1. **Un dato sin fuente no se escribe.** Los puntos y estados provienen de Jira. Las evidencias
   provienen del código, con el archivo o el commit que las respalda.
2. **Un gráfico reconstruido se declara reconstruido.** Jira no conserva el histórico de puntos por
   día, por lo que los burndowns se derivan de las fechas de commit. Cada documento lo indica.
3. **Una imagen generada no se presenta como captura.** Los tableros son renders de los datos de
   Jira y no capturas de pantalla.
4. **Un desfase se documenta y no se disimula.** Cuando el estado en Jira y la fecha del código no
   coinciden, el documento lo explica.

## Cómo interpretar el conjunto

Los sprints 1 y 2 registran pocos commits y porcentajes altos. Fueron sprints de decisiones, donde
el trabajo no deja rastro en Git. El Sprint 3 tiene 17 commits en `main` y el porcentaje más bajo,
porque se comprometió el doble de lo que el equipo venía entregando. El Sprint 4 es el único que
arranca con el pendiente de los anteriores encima.

Ese contraste constituye el hallazgo del proyecto, y se documenta en cada retrospectiva con su
acción concreta.
