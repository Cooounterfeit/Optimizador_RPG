# Sprint 4 — Release

**Estado:** sprint cerrado en la documentación el 23 de noviembre de 2026 a las 24:00. En Jira queda
activo: las historias se movieron a su estado real, pero el sprint no se finalizó.

**Versión entregada:** tag anotado `sprint-4` del 23 de noviembre, con el resumen del incremento en
el mensaje.

## Qué ingresó desde el 16 de noviembre

### Infraestructura y calidad

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `96b6752` | construcción y servicio de la aplicación con Docker |
| 17 nov | `8b3af7f` | CI valida solo lo afectado y audita dependencias |
| 18 nov | `dca27b8` | análisis de Sonar por CI con cobertura real |
| 18 nov | `66c6816` | corrección de los tres hallazgos de la quality gate |
| 18 nov | `adc8ab4` | el escaneo se omite sin `SONAR_TOKEN`, con aviso |
| 23 nov | `6c12efa` | quality gate de Sonar y S4036 del generador de ERD |

### Editor de juegos

| Fecha | Commit | Contenido |
|---|---|---|
| 20 nov | `17d444e` | crear un optimizador desde cero (CFG-05) |
| 20 nov | `c66b41c` | estilo del editor, sin rayas largas en textos ni comentarios |
| 22 nov | `998f123` | cimientos para editar la plantilla |
| 22 nov | `cec1a57` | crear un atributo base (CFG-01) |
| 22 nov | `013e8b3` | cerrar los criterios pendientes de CFG-05 |
| 22 nov | `6cff5b7` | ver y validar la configuración de un juego (CFG-06) |
| 22 nov | `8cab9f1` | quitar la duplicación del editor antes de que se triplique |
| 23 nov | `58c4980` | listar atributos con búsqueda, orden y estado (CFG-02) |
| 23 nov | `40cbc0e` | editar un atributo base (CFG-03) |
| 23 nov | `bd4b437` | eliminar un atributo base (CFG-04) |
| 23 nov | `b92a37a` | el botón de guardar pasa a flotante y decide al pulsarlo |
| 23 nov | `bcf96cd` | el botón de guardar está siempre, y la validación decide |

### Persistencia y catálogo

| Fecha | Commit | Contenido |
|---|---|---|
| 23 nov | `8eb7884` | guardar el optimizador en la cuenta (CFG-22) |
| 23 nov | `b98deb0` | el autor puede estrenar juego al guardar su optimizador |
| 23 nov | `97b46cf` | catálogo de juegos y géneros normalizado |
| 23 nov | `ab5f987` | menú de acciones en cada borrador |
| 23 nov | `17405a8` | borrar un borrador local |
| 23 nov | `5f63bb9` | borrar un borrador guardado no deja fila huérfana |
| 23 nov | `d820677` | volver a un borrador guardado |
| 23 nov | `d257300` | el guardado funciona contra el esquema nuevo |
| 23 nov | `43d2bc6` | el hub deja de pedir una columna que la vista ya no tiene |

### Interfaz del optimizador

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `b52d76f` | workspace del optimizador con rail de secciones (6.3.1) |
| 17 nov | `a0fcb94` | Overview como portada del optimizador (6.3.2) |
| 17 nov | `b58b26d` | tarjeta de objeto al pasar el cursor (6.3.3) |
| 17 nov | `d7a6a06` | una sola tarjeta de personaje (6.3.4) |
| 22 nov | `896debf` | cockpit con barra de setup y lista de resultados (6.3.5) |
| 23 nov | `3bd3e2a` | condiciones desde la barra y comparación plegable |
| 23 nov | `e4bd3bd` | setup y compare como superficie, build equipada en la comparación |
| 23 nov | `2f0184a` | la barra de setup abre y cierra la hoja en toda su superficie |
| 23 nov | `6f6d839` | presupuesto de habilidades por nivel (6.4a) |

### Cierre técnico

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `17292d2` | migración de producción a `us-west-2` con session pooler |
| 17 nov | `93364ff` | parche de `zod` y `react-router` por vulnerabilidades del bundle |
| 23 nov | `4f60139` | los fixtures se leen igual sin symlinks materializados |
| 23 nov | `275db33` | el test del optimizador no pierde el resultado al remontarse |
| 23 nov | `c313d8f` | ampliar el margen de espera que el CI agotaba bajo carga |

## Qué se puede demostrar con este incremento

1. **La aplicación se construye y se sirve en un contenedor**, sin depender de Vercel.
2. **La integración continua valida, audita y mide** cada pull request, con quality gate.
3. **El editor de atributos funciona completo.** Un usuario crea un juego, lista sus atributos, los
   edita y los elimina, con aviso de las referencias que dependen de cada uno.
4. **El optimizador se guarda en la cuenta.** El autor puede estrenar un juego al guardar, y el
   borrador local y la fila remota se borran juntos.
5. **El catálogo está normalizado.** Un juego puede tener varios géneros, con integridad
   referencial.
6. **El cockpit del optimizador** reúne barra de setup, comparación plegable y lista de resultados.

## Pendiente al cierre

| Bloque | Puntos |
|---|---|
| Editor de variables y variantes | 31 |
| Configuración avanzada (plantillas, exportación, historial) | 19 |
| Comunidad (votos, favoritos, compartir, reportes) | 17 |
| Suscripciones y pasarela de pago | 16 |
| Técnicas del cierre (sincronización, CDN, errores globales) | 29 |

Ninguna de estas historias bloquea la presentación del 24.

## Fuera de alcance hasta el Capstone

- Eliminar el juego demo hardcodeado (TEC-22). La demo constituye la evidencia de la entrega.

## Nota de trazabilidad

Cada fila de las tablas se verifica con `git merge-base --is-ancestor <hash> main`.

El alcance del sprint creció de 162 a 196 puntos durante su ejecución, porque siete tareas de
trabajo real no existían en Jira: SonarQube, Docker, pipeline de integración continua, documentación
técnica, catálogo normalizado, guardado en la cuenta y lectura portable de fixtures. Se crearon y se
cerraron en lugar de dejarlas invisibles.

CFG-20 se devolvió a «En curso» al verificar el cierre. `supabase-catalog-repository.ts` no expone
actualización ni borrado de un optimizador propio, así que la historia no cumple su criterio de
aceptación aunque estuviera en revisión.
