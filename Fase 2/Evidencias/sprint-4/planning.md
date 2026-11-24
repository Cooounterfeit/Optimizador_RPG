# Sprint 4 — Planning

**Fechas:** 16 al 29 de noviembre de 2026 en Jira. El equipo cierra el **23 a las 24:00**.
**Estado en Jira:** activo. Se movieron las historias, pero el sprint no se finalizó.
**Objetivo del sprint:** documentación, integración continua, Docker y preparación de la demo final.

## Contexto de partida

El Sprint 3 dejó la aplicación funcionando, con 56 puntos de trabajo sin cerrar.

Este sprint no incorpora funcionalidades nuevas de producto. Su propósito es cerrar la
documentación de las cuatro fases, sostener lo que ya funciona y dejar la entrega en condiciones de
presentarse.

> **Decisión del 20 de noviembre: la demo se conserva.** El juego de demostración escrito a mano no
> se elimina hasta que termine la asignatura, porque constituye la evidencia de que el motor
> resuelve un problema real con datos reales. TEC-22 deja de ser deuda de este sprint y pasa a ser
> trabajo posterior al Capstone.

## Alcance comprometido

Cuarenta y seis historias de usuario, con un total de **196 puntos**.

| Épica | HUs | Puntos |
|---|---|---|
| Configuración de juegos (CFG) | 18 | 76 |
| Infraestructura (TEC) | 17 | 74 |
| Comunidad (HUB) | 5 | 17 |
| Suscripciones (SUB) | 4 | 16 |
| Simulación (SIM) | 1 | 5 |
| Inventario (INV) | 1 | 3 |
| Interfaz (UI) | 1 | 5 |
| **Total** | **46** | **196** |

> El alcance al abrir eran 39 historias y 162 puntos. Siete historias y 34 puntos se agregaron
> durante el sprint, porque corresponden a trabajo real que no existía en Jira: análisis estático,
> Docker, pipeline de integración continua, documentación técnica, catálogo normalizado, guardado en
> la cuenta y lectura portable de fixtures. El detalle está en
> [`burndown.md`](./burndown.md#qué-se-agregó-al-alcance-y-por-qué).

## Qué se trabajó

El sprint tuvo dos frentes que avanzaron en paralelo.

**Infraestructura y calidad.** Docker para verificar el build fuera de Vercel, SonarQube con
quality gate sobre cada pull request, auditoría de dependencias y recorrido de extremo a extremo en
Chromium. Este frente se cerró completo antes del 20 de noviembre.

**Editor de juegos.** La funcionalidad que el Sprint 3 identificó como bloqueo de todo lo demás.
Al cierre quedaron cerradas seis historias: crear un juego desde cero, ver la configuración, y
listar, crear, editar y eliminar atributos base.

| HU | Título | Pts | Estado al cierre |
|---|---|---|---|
| CFG-05 | Crear un nuevo juego desde cero | 3 | Listo |
| CFG-06 | Ver la configuración completa de un juego | 3 | Listo |
| CFG-01 | Crear un atributo base | 3 | Listo |
| CFG-02 | Ver el listado de atributos base | 2 | Listo |
| CFG-03 | Editar un atributo base | 3 | Listo |
| CFG-04 | Eliminar un atributo base | 2 | Listo |
| CFG-07 | Crear una variable simple | 3 | En curso |
| CFG-08 | Crear una variable derivada | 5 | En curso |
| CFG-09A y 09B | Variables con valores por categoría | 10 | En curso |
| CFG-11 | Crear variantes de un juego | 8 | En curso |

## Riesgos identificados al inicio

| Riesgo | Situación al cierre |
|---|---|
| El juego demo está hardcodeado en el bundle | **aceptado**: es la evidencia del Capstone y se retira después de la entrega |
| Dos rutas antiguas siguen activas (`/inventario`, `/calculadora-dano`) | **resuelto**: TEC-23 las redirige a la home |
| La interfaz del optimizador tiene dos versiones vigentes | **resuelto**: UI-01 dejó una sola, montada en el workspace |
| El sprint incluye 28 historias que no provienen de este sprint | **gestionado**: se cerraron con lista explícita de lo que no ingresa |

## Criterios de aceptación del sprint

| Criterio | Estado |
|---|---|
| La demo se levanta con un comando y resuelve el juego de ejemplo | cumplido |
| Un usuario puede crear un juego desde cero con atributos | cumplido: CFG-05 y CFG-01 a CFG-04 |
| Existe una sola interfaz de optimizador | cumplido: UI-01 |
| CI está en verde y Docker construye la aplicación | cumplido: TEC-24, TEC-25 y TEC-28 |

## Estado al cierre, 23 de noviembre

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 20 | 79 |
| En curso | 7 | 36 |
| Por hacer | 19 | 81 |
| **Total** | **46** | **196** |

## Lo que no se cierra y por qué

Las 19 historias en «Por hacer» se agrupan en cuatro bloques, y ninguno estaba planificado para este
sprint.

| Bloque | Puntos | Motivo |
|---|---|---|
| Comunidad: votos, favoritos, compartir y reportes | 17 | depende del hub, que llegó en el Sprint 3 |
| Suscripciones y pasarela de pago | 16 | requiere Stripe, fuera del alcance del Capstone |
| Configuración avanzada: plantillas, exportación e historial | 19 | depende del editor de variables, aún en curso |
| Técnicas del cierre: sincronización, CDN, errores globales | 14 | no bloquean la entrega |

Las 7 historias en «En curso» corresponden al editor de variables y variantes. Empezaron y quedaron
a mitad de camino. Declararlas terminadas sería falso: el código de variables no existe todavía.

## Decisión de cierre

El sprint se cierra en la documentación y en el repositorio. **No se finaliza en Jira**, por decisión
del equipo: el tablero queda con las historias movidas a su estado real, y el cierre formal se hace
después de la entrega. Así el estado de Jira coincide con lo que existe en el código, y no al revés.
