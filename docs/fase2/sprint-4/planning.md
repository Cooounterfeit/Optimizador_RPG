# Sprint 4 — Planning

**Fechas:** 16 al 29 de noviembre de 2026 en Jira; el equipo cierra el **23 a las 24:00**
**Estado en Jira:** activo al 20 de noviembre de 2026, última verificación contra su API
**Objetivo del sprint (registrado en Jira):** documentación, CI/CD, Docker y preparación de la demo
final.

> Este documento describe un sprint en curso. Los datos corresponden a lo que devuelve Jira el 20 de
> noviembre de 2026. Jira lo fecha del 16 al 29, pero el equipo lo cierra el 23 a medianoche porque
> la entrega se presenta el 24. Esa es la ventana que utilizan el burndown y las cifras de avance.

## Contexto de partida

El Sprint 3 dejó la aplicación funcionando, con 56 puntos de trabajo sin cerrar.

Este sprint no incorpora funcionalidades nuevas. Su propósito es cerrar la documentación de las
cuatro fases y sostener lo que ya funciona, sin abrir frentes adicionales.

> **Decisión del 20 de noviembre: la demo se conserva.** El juego de demostración escrito a mano no
> se elimina hasta que termine la asignatura, porque constituye la evidencia de que el motor
> resuelve un problema real con datos reales. TEC-22 deja de ser deuda de este sprint y pasa a ser
> trabajo posterior al Capstone.

## Alcance comprometido

Treinta y nueve historias de usuario, con un total de **162 puntos**.

| Épica | HUs | Puntos |
|---|---|---|
| Configuración de juegos (CFG) | 16 | 68 |
| Infraestructura (TEC) | 10 | 45 |
| Comunidad (HUB) | 5 | 17 |
| Suscripciones (SUB) | 4 | 16 |
| Simulación (SIM) | 1 | 5 |
| Inventario (INV) | 1 | 3 |
| Interfaz (UI) | 1 | 5 |
| Investigación (SP) | 1 | 3 |
| **Total** | **39** | **162** |

> El alcance incluye el trabajo que llegó en el ordenamiento del 20 de noviembre, con un total de
> **28 historias**. De ellas, 18 se arrastraron de los sprints 1 a 3 (2 del Sprint 1, 2 del Sprint 2
> y 14 del Sprint 3), 9 no tenían sprint asignado y SP-01 volvió desde el Sprint 0, donde había
> quedado abierta desde septiembre. Las otras 11 ya estaban en el sprint: 7 de trabajo en curso y 4
> creadas para el cierre.
>
> Todo permanece en el sprint abierto para que el pendiente sea visible en un solo lugar, en lugar
> de repartirlo en un backlog que nadie consulta.

## Qué se está trabajando

Al 20 de noviembre existen **siete historias en curso**, y son las que definen el sprint:

| HU | Título | Pts |
|---|---|---|
| CFG-01 | Crear un atributo base de un juego | 3 |
| CFG-07 | Crear una variable simple a partir de un atributo | 3 |
| CFG-08 | Crear una variable derivada mediante fórmulas | 5 |
| CFG-09A | Crear una variable con valores por categoría | 5 |
| CFG-09B | Crear una variable con valores por categoría | 5 |
| CFG-11 | Crear variantes de un juego sin tocar el original | 8 |
| TEC-21 | Refinar redacción y criterios de las HU | 5 |

En conjunto, corresponden al editor de juegos, la funcionalidad que el Sprint 3 identificó como
bloqueo de todo lo demás.

## Riesgos identificados al inicio

| Riesgo | Situación |
|---|---|
| El juego demo está hardcodeado en el bundle | **aceptado**: es la evidencia del Capstone y se retira después de la entrega |
| Dos rutas antiguas siguen activas (`/inventario`, `/calculadora-dano`) | TEC-23 las redirige a la home |
| La interfaz del optimizador tiene dos versiones vigentes | UI-01 las unifica antes de la entrega |
| El sprint incluye 28 historias que no provienen de este sprint | se dejan visibles como pendiente y no se marcan como hechas |

## Criterios de aceptación del sprint

- La demo se levanta con un comando y resuelve el juego de ejemplo.
- Un usuario puede crear un juego desde cero con atributos, variables y variantes.
- Existe una sola interfaz de optimizador.
- CI está en verde y Docker construye la aplicación.

## Estado al 20 de noviembre

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 1 | 3 |
| En revisión | 4 | 18 |
| En curso | 7 | 34 |
| Por hacer | 27 | 107 |
| **Total** | **39** | **162** |

El único cierre corresponde a **SP-01** (evaluación de monorepos), una historia de investigación del
sprint de arranque que se cerró al ordenar el proyecto el 20 de noviembre. El monorepo existe,
funciona y la evaluación tenía respuesta desde septiembre.

## Al cierre, 23 de noviembre

La tabla anterior corresponde a la foto de Jira. Lo que se puede verificar es el código. Entre el 20
y el 23 de noviembre ingresaron CFG-05 completo (`17d444e`, `013e8b3`), CFG-06 (`6cff5b7`), CFG-01
(`cec1a57`) y el cockpit 6.3.5 (`896debf`, `3bd3e2a`). El detalle, con la tabla de commits, está en
[`backlog.md`](./backlog.md#evidencia-de-código-al-cierre-23-de-noviembre).

El sprint no se declara cerrado en Jira a la fecha de este documento. Los estados de la tabla se
actualizan desde su API y esa verificación no se repitió. Declararlo cerrado sin esa comprobación
implicaría presentar como hecho algo que no se comprobó.
