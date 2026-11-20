# Sprint 4 — Planning

**Fechas:** 16 al 29 de noviembre de 2026
**Estado en Jira:** **activo** al 20 de noviembre de 2026
**Objetivo del sprint (registrado en Jira):** documentación, CI/CD, Docker y preparación de la demo
final.

> Este documento describe un sprint **en curso**. Los datos son los que devuelve Jira el 20 de
> noviembre de 2026. Jira lo fecha del 16 al 29, pero el equipo lo cierra el 22 o 23 porque la
> entrega se presenta antes: esa es la ventana que usan el burndown y las cifras de avance.

## Contexto de partida

El Sprint 3 dejó la aplicación funcionando, pero con 56 puntos de trabajo sin cerrar y un problema
estructural: parte del producto todavía depende de un juego de demostración escrito a mano.

Este sprint no es de funcionalidades nuevas. Es de **quitar lo que sostiene la demo** para que la
aplicación se sostenga sola, y de cerrar la documentación de las cuatro fases.

## Alcance comprometido

39 historias de usuario, **162 puntos**.

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

> El alcance incluye el trabajo que llegó en el ordenamiento del 20 de noviembre: **28 HUs**. De
> ellas, 18 se arrastraron de los sprints 1 a 3 (2 del Sprint 1, 2 del Sprint 2 y 14 del Sprint 3),
> 9 no tenían sprint asignado y SP-01 volvió desde el Sprint 0, donde había quedado abierta desde
> septiembre. Las otras 11 ya estaban en el sprint: 7 de trabajo en curso y 4 creadas para el
> cierre. Se mantiene todo en el sprint abierto para que el pendiente sea visible en un solo lugar,
> en vez de repartirlo en un backlog que nadie mira.

## Qué se está trabajando de verdad

Al 20 de noviembre hay **siete HUs en curso**, y son las que definen el sprint:

| HU | Título | Pts |
|---|---|---|
| CFG-01 | Crear un atributo base de un juego | 3 |
| CFG-07 | Crear una variable simple a partir de un atributo | 3 |
| CFG-08 | Crear una variable derivada mediante fórmulas | 5 |
| CFG-09A | Crear una variable con valores por categoría | 5 |
| CFG-09B | Crear una variable con valores por categoría | 5 |
| CFG-11 | Crear variantes de un juego sin tocar el original | 8 |
| TEC-21 | Refinar redacción y criterios de las HU | 5 |

Es decir: **el editor de juegos**, la funcionalidad que el Sprint 3 identificó como bloqueo de
todo lo demás.

## Riesgos identificados al inicio

| Riesgo | Mitigación aplicada |
|---|---|
| El juego demo está hardcodeado en el bundle | TEC-22 lo elimina; es la HU que más riesgo tiene |
| Dos rutas viejas siguen activas (`/inventario`, `/calculadora-dano`) | TEC-23 las redirige a la home |
| La interfaz del optimizador tiene dos versiones vivas | UI-01 las unifica antes de la entrega |
| El sprint incluye 28 HUs que no vienen de este sprint | Se dejan visibles como pendiente, no se marcan como hechas |

## Criterio de aceptación del sprint

- La aplicación funciona sin ningún juego de demostración en el código.
- Un usuario puede crear un juego desde cero con atributos, variables y variantes.
- Una sola interfaz de optimizador, no dos.
- CI en verde, Docker construye y la demo se levanta con un comando.

## Estado al 20 de noviembre

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 1 | 3 |
| En revisión | 4 | 18 |
| En curso | 7 | 34 |
| Por hacer | 27 | 107 |
| **Total** | **39** | **162** |

El único cierre es **SP-01** (evaluación de monorepos), una HU de investigación del sprint de
arranque que se cerró al ordenar el proyecto el 20 de noviembre: el monorepo existe, funciona y la
evaluación tenía respuesta desde septiembre.
