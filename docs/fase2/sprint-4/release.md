# Sprint 4 — Release

**Estado:** sprint activo al 23 de noviembre de 2026. Cierra hoy a las 24:00; Jira lo fecha del 16
al 29.

**Versión entregada:** tag anotado `sprint-4` sobre `578b14b` (23 de noviembre), con el resumen del
incremento en el mensaje. Creado en local al cierre de la ventana de trabajo.

> Los sprints 1 a 3 ya tienen su tag publicado en GitHub. El de este sprint existe en el repositorio
> local; su publicación queda a la espera de confirmar que el sprint está efectivamente cerrado en
> Jira.

## Qué entró a `main` desde el 16 de noviembre

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `b52d76f` | Workspace del optimizador con rail de secciones (6.3.1) |
| 17 nov | `a0fcb94` | Overview como portada del optimizador (6.3.2) |
| 17 nov | `b58b26d` | Tarjeta de objeto al pasar el cursor (6.3.3) |
| 17 nov | `d7a6a06` | Una sola tarjeta de personaje (6.3.4) |
| 17 nov | `f61545f` | La prueba del límite de tiempo mide lo enviado, no lo configurado |
| 17 nov | `77bfe37` | Base de Nx y versión de Node alineadas |
| 17 nov | `96b6752` | Construcción y servicio de la app con Docker |
| 17 nov | `8b3af7f` | CI valida solo lo afectado y audita dependencias |
| 17 nov | `e63a1fc` | Arquitectura, entornos, pruebas y ADRs |
| 17 nov | `021ed50` | Guía paso a paso de Vercel y Supabase |
| 17 nov | `93364ff` | Parche de `zod` y `react-router` por vulnerabilidades del bundle |
| 17 nov | `95e1dea` | Rutas con extensión excluidas del fallback del SPA |
| 17 nov | `3cf8e55` | El enlace de confirmación vuelve a la propia app |
| 17 nov | `17292d2` | Migración de producción a `us-west-2` y session pooler |
| 18 nov | `dca27b8` | Análisis de Sonar por CI con cobertura real |
| 18 nov | `66c6816` | Corrección de los tres hallazgos de la quality gate |
| 18 nov | `b77b04b` | Diagramas UML, modelo de datos y plan de pruebas ampliado |
| 18 nov | `b45ef50` | Ritmo de trabajo alineado con los 4 sprints de Jira |
| 20 nov | `17d444e` | **Editor: crear un optimizador desde cero (CFG-05)** |
| 20 nov | `c66b41c` | Estilo del editor: sin rayas largas en textos ni comentarios |
| 22 nov | `998f123` | Cimientos para editar la plantilla |
| 22 nov | `cec1a57` | Crear un atributo base (CFG-01) |
| 22 nov | `013e8b3` | Cerrar los criterios pendientes de CFG-05 |
| 22 nov | `6cff5b7` | Ver y validar la configuración de un juego (CFG-06) |
| 22 nov | `896debf` | Cockpit con barra de setup y lista de resultados (6.3.5) |
| 23 nov | `3bd3e2a` | Condiciones desde la barra y comparación plegada (6.3.5) |
| 23 nov | `97b46cf` | Catálogo de juegos y géneros normalizado en Supabase |

Cada fila se verifica con `git merge-base --is-ancestor <hash> main`.

## Qué se puede demostrar con este incremento

1. **Despliegue verificado en producción** con Supabase conectado, migrado a `us-west-2`.
2. **Docker construye y sirve la aplicación**, sin depender de Vercel para verificar.
3. **CI valida solo lo afectado**, audita dependencias y corre análisis estático con cobertura.
4. **El editor existe y funciona**: crear un optimizador desde cero (CFG-05), ver y validar su
   configuración (CFG-06) y crear atributos base (CFG-01).
5. **El cockpit del optimizador** reúne barra de setup, comparación plegada y lista de resultados
   (6.3.5).

## Pendiente al cierre

- Unificar la interfaz del optimizador (UI-01).
- Redirigir las rutas viejas (TEC-23).
- Publicar la etiqueta `sprint-4` en GitHub.

## Fuera de alcance hasta el Capstone

- Eliminar el juego demo hardcodeado (TEC-22). **La demo es la evidencia de la entrega**: se retira
  cuando el proyecto continúe como Zenith Optimizer, no antes.

## Nota de trazabilidad

Dos correcciones aplicadas al reconstruir este documento contra el repositorio:

1. **Hashes actualizados.** Las versiones anteriores de este documento citaban dos commits para
   CFG-05 y el ajuste de estilo que fueron reescritos al integrar la rama por rebase. En `main`
   el mismo trabajo aparece como `17d444e` y `c66b41c`, que son los que se citan en la tabla y los
   que un evaluador puede verificar.
2. **Afirmación de despliegue corregida.** El CI valida, audita y corre análisis estático, pero no
   despliega: el despliegue lo hace Vercel por integración de Git. La fila de `8b3af7f` decía «y
   despliega», que el workflow no hace.

CFG-05 quedó con código el 20 de noviembre y Jira todavía la muestra en «Por hacer». Se deja así a
propósito: la HU se cierra cuando la funcionalidad está verificada en la versión final, no cuando
existe el primer commit. La discrepancia queda anotada acá para que no parezca un descuido.
