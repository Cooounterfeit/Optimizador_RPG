# Sprint 4 — Backlog

Estado verificado contra la API de Jira el 24 de noviembre de 2026. Proyecto `ZO`, sprint 4
(«Sprint 4 — Cierre y entrega»).

> **Nota de lectura.** Toda historia marcada como «Listo» tiene un commit que la respalda en el
> repositorio. Las que están «En curso» tienen código parcial o ninguna implementación, y se
> declaran así para no presentar como hecho algo que no existe. El sprint no se finalizó en Jira:
> las tarjetas quedaron en su estado real y el cierre formal se hará después de la entrega.

## Resumen

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 20 | 79 |
| En curso | 7 | 36 |
| Por hacer | 19 | 81 |
| **Total** | **46** | **196** |

## Listo (20 HUs · 79 puntos)

### Editor de juegos (6 HUs · 16 puntos)

| HU | Título | Pts | Commit |
|---|---|---|---|
| ZO-11 · CFG-05 | Crear un nuevo juego desde cero | 3 | `17d444e`, `013e8b3` |
| ZO-12 · CFG-06 | Ver la configuración completa de un juego | 3 | `6cff5b7` |
| ZO-13 · CFG-01 | Crear un atributo base | 3 | `cec1a57`, `998f123` |
| ZO-72 · CFG-02 | Ver el listado de atributos base | 2 | `58c4980`, `f6ee87c` |
| ZO-73 · CFG-03 | Editar un atributo base | 3 | `40cbc0e`, `accbaa3` |
| ZO-74 · CFG-04 | Eliminar un atributo base | 2 | `bd4b437`, `ffddc44` |

### Persistencia y catálogo (2 HUs · 10 puntos)

| HU | Título | Pts | Commit |
|---|---|---|---|
| ZO-94 · CFG-22 | Guardar el optimizador en la cuenta del autor | 5 | `8eb7884`, `b98deb0`, `5f63bb9` |
| ZO-95 · TEC-27 | Catálogo de juegos y géneros normalizado | 5 | `97b46cf` |

### Infraestructura y calidad (4 HUs · 18 puntos)

| HU | Título | Pts | Commit |
|---|---|---|---|
| ZO-91 · TEC-24 | Análisis estático con SonarQube y quality gate | 5 | `dca27b8`, `66c6816`, `6c12efa` |
| ZO-92 · TEC-25 | Construir y servir la aplicación con Docker | 3 | `96b6752` |
| ZO-96 · TEC-28 | Pipeline de integración continua | 5 | `f8adce1`, `8b3af7f` |
| ZO-97 · TEC-29 | Lectura portable de los fixtures en Windows | 3 | `4f60139` |

### Plataforma y cierre (8 HUs · 35 puntos)

| HU | Título | Pts | Commit |
|---|---|---|---|
| ZO-51 · TEC-01 | Proyecto Supabase y autenticación | 3 | `17044c6`, migraciones |
| ZO-53 · TEC-03 | Reglas de seguridad (RLS) en Supabase | 5 | `17044c6`, pruebas PGlite |
| ZO-66 · TEC-16 | Cargar datos iniciales de juegos | 3 | `97b46cf`, `seed.sql` |
| ZO-89 · TEC-23 | Rutas antiguas redirigen a la home | 5 | `17d444e`, `router.tsx` |
| ZO-90 · UI-01 | Unificar la interfaz del optimizador | 5 | `b92a37a`, `sections.ts` |
| ZO-93 · TEC-26 | Reescritura de la documentación técnica | 8 | `cce392c`, `06f3d0c` |
| ZO-8 · SIM-02 | Simulación de estadísticas por nivel | 5 | `6f6d839`, `useSetLevel.ts` |
| ZO-70 · SP-01 | Evaluar el uso de monorepos | 3 | cerrada el 20 de noviembre |

## En curso (7 HUs · 36 puntos)

Son el editor de variables y variantes. Tienen diseño y puntos asignados, pero el código de
variables no existe todavía: `libs/shared-types` no declara el tipo y `apps/web/src/features/editor`
no tiene editor de variables.

| HU | Título | Pts | Situación |
|---|---|---|---|
| ZO-14 · CFG-07 | Crear una variable simple a partir de un atributo | 3 | sin implementación |
| ZO-15 · CFG-08 | Crear una variable derivada mediante fórmulas | 5 | sin implementación |
| ZO-16 · CFG-09A | Crear una variable con valores por categoría | 5 | sin implementación |
| ZO-75 · CFG-09B | Crear una variable con valores por categoría | 5 | sin implementación |
| ZO-18 · CFG-11 | Crear variantes de un juego sin tocar el original | 8 | sin implementación |
| ZO-26 · CFG-20 | Edición y eliminación de optimizadores | 5 | verificado incompleto |
| ZO-77 · TEC-21 | Refinar redacción y criterios de las HU | 5 | trabajo parcial |

> **Sobre CFG-20.** Se revisó `supabase-catalog-repository.ts` y no expone actualización ni borrado
> de un optimizador propio. La historia se devolvió a «En curso» al verificar el cierre, porque no
> cumple su criterio de aceptación.

## Por hacer (19 HUs · 81 puntos)

### Configuración avanzada (4 HUs · 19 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-22 · CFG-16 | Ver el historial de cambios y versiones | 8 |
| ZO-19 · CFG-13 | Guardar la configuración como plantilla reutilizable | 5 |
| ZO-20 · CFG-14 | Exportar la configuración de un juego | 3 |
| ZO-36 · INV-6 | Exportar mi inventario | 3 |

### Comunidad (5 HUs · 17 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-24 · HUB-02 | Sistema de votación de optimizadores | 5 |
| ZO-27 · HUB-21 | Guardado de optimizadores como favoritos | 3 |
| ZO-28 · HUB-22 | Compartir optimizadores | 3 |
| ZO-29 · HUB-23 | Reporte de optimizadores inapropiados | 3 |
| ZO-40 · HUB-34 | Personalizar el aspecto visual de un optimizador | 3 |

### Suscripciones (4 HUs · 16 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-38 · SUB-32 | Elegir un plan de suscripción | 5 |
| ZO-42 · SUB-36 | Donar meses de suscripción a un creador | 5 |
| ZO-43 · SUB-37 | Ver el estado de mi suscripción | 3 |
| ZO-44 · SUB-38 | Ver las donaciones que he recibido | 3 |

### Técnicas y cierre (6 HUs · 29 puntos)

| HU | Título | Pts |
|---|---|---|
| ZO-59 · TEC-09 | Pasarela de pago (Stripe) y suscripciones | 8 |
| ZO-58 · TEC-08 | Sincronización con merge de conflictos | 5 |
| ZO-87 · TEC-22 | Eliminar el juego demo del bundle | 5 |
| ZO-88 · CFG-21 | Ver un optimizador publicado en modo lectura | 5 |
| ZO-67 · TEC-17 | Carga de imágenes desde CDN | 3 |
| ZO-68 · TEC-18 | Manejo global de errores y logging | 3 |

## Qué revela este sprint

**La infraestructura dejó de ser deuda.** SonarQube, Docker y el pipeline completo se cerraron en
los primeros cinco días, y no aparecen como pendiente en ningún bloque del backlog.

**El editor es el cuello de botella real.** Dieciocho historias dependen de él, y seis cerraron.
Las que quedan en curso son todas del mismo bloque: variables y variantes.

**El alcance creció un 21 % durante el sprint.** De 162 a 196 puntos. El trabajo que no estaba en
Jira se creó y se cerró, en lugar de dejarlo invisible. Eso mejora la trazabilidad y empeora el
porcentaje de cumplimiento, y el equipo eligió la trazabilidad.

## Verificación

Cada cierre de este documento se comprobó contra el repositorio, no contra la memoria del equipo.

- `git merge-base --is-ancestor <hash> main` para cada commit citado.
- Búsqueda directa en `apps/web/src` y `libs` antes de declarar una historia terminada.
- Consulta a la API de Jira para los estados y los puntos.
