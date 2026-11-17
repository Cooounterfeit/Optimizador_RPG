# Definition of Ready / Definition of Done

Acuerdos del equipo para decidir **cuándo una historia puede empezar** y **cuándo está
terminada**. Viven en el repositorio, no solo en una herramienta: así se versionan y cambian
con un pull request.

## Definition of Ready (DoR)

Una historia entra a un sprint solo si cumple **todo** esto:

| # | Criterio | Cómo se verifica |
|---|---|---|
| 1 | Formato de historia: *Yo como… quiero… para…* | Lectura del texto |
| 2 | Criterios de aceptación verificables | Al menos uno demostrable |
| 3 | Estimada en puntos de historia (≤ 13) | Campo en Jira |
| 4 | Épica asignada | Herencia en el tablero |
| 5 | Sin dependencias abiertas | Enlace a la que bloquea |
| 6 | Cabe en un sprint | Estimación vs. capacidad |
| 7 | Alcance claro, sin decisiones pendientes | Revisión del equipo |

**Por qué 13 es el techo:** una historia que no cabe en un sprint esconde dos o tres
historias. Si al estimarla pasa de 13, se parte antes de aceptarla — no se acepta y se
descubre a mitad de sprint.

**Por qué exige criterios verificables:** "mejorar el rendimiento" no se puede probar.
"El solver resuelve un inventario de 200 ítems en menos de 2 s en el presupuesto de prueba"
sí.

## Definition of Done (DoD)

Una historia está terminada solo si cumple **todo** esto:

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Criterios de aceptación cumplidos | Demostración en Review |
| 2 | Pruebas unitarias verdes | CI en verde |
| 3 | Lint sin errores | CI en verde |
| 4 | Tipos sin errores | CI en verde |
| 5 | Build de producción funciona | CI en verde |
| 6 | Revisado por otro integrante | PR aprobado |
| 7 | Documentación actualizada si cambió el contrato | Diff del PR |
| 8 | Desplegado y verificable | URL o entorno |

**Lo que no cuenta como terminado:**

- "Funciona en mi máquina" sin pasar CI.
- Código sin pruebas cuando la lógica lo justifica.
- Un cambio de contrato sin actualizar `shared-types` y su documentación.
- Un PR sin revisar, aunque lo haya escrito el líder del área.

## Diferencia con "hecho"

El tablero tiene `En revisión` además de `Listo` por una razón: entre que el trabajo está
escrito y que está aceptado hay un paso real. Mover a `Listo` sin PR revisado salta el paso
que garantiza que el DoD se cumplió.

## Cambios a este documento

Se modifican por pull request. Si el equipo baja un criterio para cumplir una fecha, queda
en el historial de Git — que es exactamente el punto.
