# Definición de Ready y Definición de Done

Estos acuerdos determinan cuándo una historia puede comenzar y cuándo está terminada. Se almacenan en el repositorio y no solo en una herramienta externa. De esta forma se versionan y se modifican mediante un pull request.

## Definición de Ready (DoR)

Una historia ingresa a un sprint únicamente si cumple todos los criterios siguientes:

| # | Criterio | Verificación |
|---|---|---|
| 1 | Formato de historia: *Yo como… quiero… para…* | lectura del texto |
| 2 | Criterios de aceptación verificables | al menos uno demostrable |
| 3 | Estimada en puntos de historia (máximo 13) | campo en Jira |
| 4 | Épica asignada | herencia en el tablero |
| 5 | Sin dependencias abiertas | enlace a la historia que bloquea |
| 6 | Cabe en un sprint | estimación frente a capacidad |
| 7 | Alcance claro, sin decisiones pendientes | revisión del equipo |

**Por qué 13 es el límite.** Una historia que no cabe en un sprint oculta dos o tres historias
adicionales. Si al estimarla supera 13, se divide antes de aceptarla. No se acepta para descubrir
el problema a mitad de sprint.

**Por qué se exigen criterios verificables.** «Mejorar el rendimiento» no se puede comprobar.
En cambio, el siguiente criterio sí se puede comprobar: «el solver resuelve un inventario de 200
objetos en menos de 2 s dentro del presupuesto de prueba».

## Definición de Done (DoD)

Una historia está terminada únicamente si cumple todos los criterios siguientes:

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Criterios de aceptación cumplidos | demostración en Review |
| 2 | Pruebas unitarias en verde | CI en verde |
| 3 | Lint sin errores | CI en verde |
| 4 | Tipos sin errores | CI en verde |
| 5 | Build de producción funcional | CI en verde |
| 6 | Revisión de otro integrante | pull request aprobado |
| 7 | Documentación actualizada si cambió el contrato | diff del pull request |
| 8 | Desplegado y verificable | URL o entorno |

**Qué no cuenta como terminado:**

- Funcionamiento local sin pasar CI.
- Código sin pruebas cuando la lógica lo justifica.
- Un cambio de contrato sin actualizar `shared-types` y su documentación.
- Un pull request sin revisar, aunque lo haya escrito el líder del área.

## Diferencia entre revisión y cierre

El tablero distingue `En revisión` de `Listo` por una razón concreta. Entre que el trabajo está
escrito y que está aceptado existe un paso real. Mover a `Listo` sin un pull request revisado omite
el paso que garantiza el cumplimiento del DoD.

## Modificaciones a este documento

Se modifican mediante pull request. Si el equipo rebaja un criterio para cumplir una fecha, el
cambio queda en el historial de Git. Ese registro es el objetivo del acuerdo.
