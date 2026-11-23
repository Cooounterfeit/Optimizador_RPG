# Sprint 4 — Backlog

Estado **al 20 de noviembre de 2026**, con el sprint activo. Fuente: Jira, proyecto `ZO`, sprint 4
("Sprint 4 — Cierre y entrega").

> **Nota de lectura.** La foto de Jira es del 20 de noviembre porque es la última verificación
> contra su API que quedó registrada. El sprint cierra el 23 de noviembre a las 24:00, y entre esas
> dos fechas entraron los commits que están al final de este documento. Los estados de las tablas
> no se actualizan a mano: se actualizan desde Jira, y una tabla editada sin esa verificación sería
> un relato paralelo. La evidencia de código sí está, y es la que se puede comprobar.

## En curso (7 HUs · 34 puntos)

| HU | Título | Pts | Estado |
|---|---|---|---|
| ZO-13 · CFG-01 | Crear un atributo base de un juego | 3 | En curso |
| ZO-14 · CFG-07 | Crear una variable simple a partir de un atributo | 3 | En curso |
| ZO-15 · CFG-08 | Crear una variable derivada mediante fórmulas | 5 | En curso |
| ZO-16 · CFG-09A | Crear una variable con valores por categoría | 5 | En curso |
| ZO-75 · CFG-09B | Crear una variable con valores por categoría | 5 | En curso |
| ZO-18 · CFG-11 | Crear variantes de un juego sin tocar el original | 8 | En curso |
| ZO-77 · TEC-21 | Refinar redacción y criterios de las HU | 5 | En curso |

## En revisión (4 HUs · 18 puntos)

| HU | Título | Pts | Origen |
|---|---|---|---|
| ZO-8 · SIM-02 | Simulación de estadísticas futuras por nivel | 5 | Sprint 3 |
| ZO-26 · CFG-20 | Edición y eliminación de optimizadores | 5 | Sprint 3 |
| ZO-51 · TEC-01 | Proyecto Supabase y autenticación | 3 | Sprint 3 |
| ZO-53 · TEC-03 | Reglas de seguridad (RLS) en Supabase | 5 | Sprint 3 |

## Por hacer (27 HUs · 107 puntos)

### Cierre de entrega (10 HUs · 36 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-87 · TEC-22 | Eliminar el juego demo hardcodeado del bundle | 5 |
| ZO-88 · CFG-21 | Ver un optimizador publicado en modo lectura | 5 |
| ZO-89 · TEC-23 | Las rutas `/inventario` y `/calculadora-dano` redirigen a la home | 5 |
| ZO-90 · UI-01 | Unificar la interfaz del optimizador para la entrega | 5 |
| ZO-11 · CFG-05 | Crear un nuevo juego desde cero | 3 |
| ZO-12 · CFG-06 | Ver la configuración completa de un juego | 3 |
| ZO-73 · CFG-03 | Editar un atributo base de un juego | 3 |
| ZO-40 · HUB-34 | Personalizar el aspecto visual de un optimizador | 3 |
| ZO-74 · CFG-04 | Eliminar un atributo base de un juego | 2 |
| ZO-72 · CFG-02 | Ver el listado de atributos base de un juego | 2 |

### Configuración avanzada (4 HUs · 19 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-22 · CFG-16 | Ver el historial de cambios y versiones | 8 |
| ZO-19 · CFG-13 | Guardar la configuración como plantilla reutilizable | 5 |
| ZO-20 · CFG-14 | Exportar la configuración de un juego | 3 |
| ZO-36 · INV-6 | Exportar mi inventario | 3 |

### Comunidad (4 HUs · 14 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-24 · HUB-02 | Sistema de votación de optimizadores | 5 |
| ZO-27 · HUB-21 | Guardado de optimizadores como favoritos | 3 |
| ZO-28 · HUB-22 | Compartir optimizadores | 3 |
| ZO-29 · HUB-23 | Reporte de optimizadores inapropiados | 3 |

### Suscripciones (4 HUs · 16 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-38 · SUB-32 | Elegir un plan de suscripción | 5 |
| ZO-42 · SUB-36 | Donar meses de suscripción a un creador | 5 |
| ZO-43 · SUB-37 | Ver el estado de mi suscripción | 3 |
| ZO-44 · SUB-38 | Ver las donaciones que he recibido | 3 |

### Técnicas del cierre (5 HUs · 22 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-59 · TEC-09 | Pasarela de pago (Stripe) y suscripciones | 8 |
| ZO-58 · TEC-08 | Servicio de sincronización con merge de conflictos | 5 |
| ZO-66 · TEC-16 | Cargar datos iniciales (seed) de 1-2 juegos | 3 |
| ZO-67 · TEC-17 | Carga de imágenes desde CDN | 3 |
| ZO-68 · TEC-18 | Manejo global de errores y logging | 3 |

## Listo (1 HU · 3 puntos)

| HU | Título | Pts | Cuándo |
|---|---|---|---|
| ZO-70 · SP-01 | Evaluar el uso de monorepos | 3 | Cerrada el 20-nov, al ordenar Jira |

## Resumen

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 1 | 3 |
| En revisión | 4 | 18 |
| En curso | 7 | 34 |
| Por hacer | 27 | 107 |
| **Total** | **39** | **162** |

## Lo que este sprint dice del proyecto

De las 39 HUs del sprint, **16 son de configuración de juegos** y todas dependen del editor. Eso no
es casualidad: el editor es el corazón del producto —lo que diferencia a Zenith de una calculadora
de builds— y llegó último porque todo lo demás era requisito previo.

La segunda concentración son las **cuatro de suscripciones**, que dependen de Stripe (TEC-09) y no
se van a cerrar en este sprint. Se mantienen visibles como pendiente declarado en lugar de
marcarlas como fuera de alcance.

## Evidencia de código al cierre (23 de noviembre)

Lo que entró entre la foto de Jira y el cierre, con el commit que lo respalda:

| HU | Commit | Qué quedó implementado |
|---|---|---|
| CFG-05 · Crear un juego desde cero | `17d444e`, `013e8b3` | Editor completo: plantilla, validación y criterios cerrados |
| CFG-06 · Ver la configuración de un juego | `6cff5b7` | Pantalla de solo lectura con validación |
| CFG-01 · Crear un atributo base | `cec1a57`, `998f123` | Atributo base con identificadores y referencias |
| CFG-02/03/04 · Ver, editar y eliminar atributos | `cec1a57`, `8cab9f1` | Gestión de atributos base en el editor |
| 6.3.1 a 6.3.5 · Interfaz del optimizador | `b52d76f`, `a0fcb94`, `b58b26d`, `d7a6a06`, `896debf`, `3bd3e2a` | Workspace, Overview, tarjetas, cockpit y comparación |
| 6.4a · Presupuesto de habilidades por nivel | `6f6d839` | Proyección de puntos por nivel |
| Catálogo de juegos y géneros | `97b46cf` | Normalización en Supabase |
| TEC-03 · RLS | `17044c6` | 40 políticas probadas con PGlite (89 casos) |

Las cuatro HUs de suscripciones y la pasarela de pago siguen sin implementación al cierre. También
quedan fuera las de comunidad (votos, favoritos, compartir y reportes) y la exportación de
inventario. El informe final las declara como pendientes; no se marcan como terminadas.
