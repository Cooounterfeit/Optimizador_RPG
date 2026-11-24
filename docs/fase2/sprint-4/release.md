# Sprint 4 — Release

**Estado:** sprint cerrado el 23 de noviembre de 2026 a las 24:00. Jira lo fecha del 16 al 29.

**Versión entregada:** tag anotado `sprint-4` del 23 de noviembre, con el resumen del incremento en
el mensaje. Se creó en local al cierre de la ventana de trabajo.

> Los sprints 1 a 3 tienen su tag publicado en GitHub. El de este sprint existe en el repositorio
> local, y su publicación queda pendiente de confirmar el cierre del sprint en Jira.

## Qué ingresó a `main` desde el 16 de noviembre

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `b52d76f` | workspace del optimizador con rail de secciones (6.3.1) |
| 17 nov | `a0fcb94` | Overview como portada del optimizador (6.3.2) |
| 17 nov | `b58b26d` | tarjeta de objeto al pasar el cursor (6.3.3) |
| 17 nov | `d7a6a06` | una sola tarjeta de personaje (6.3.4) |
| 17 nov | `f61545f` | la prueba del límite de tiempo mide lo enviado y no lo configurado |
| 17 nov | `77bfe37` | base de Nx y versión de Node alineadas |
| 17 nov | `96b6752` | construcción y servicio de la aplicación con Docker |
| 17 nov | `8b3af7f` | CI valida solo lo afectado y audita dependencias |
| 17 nov | `e63a1fc` | arquitectura, entornos, pruebas y ADR |
| 17 nov | `021ed50` | guía paso a paso de Vercel y Supabase |
| 17 nov | `93364ff` | parche de `zod` y `react-router` por vulnerabilidades del bundle |
| 17 nov | `95e1dea` | rutas con extensión excluidas del fallback del SPA |
| 17 nov | `3cf8e55` | el enlace de confirmación vuelve a la propia aplicación |
| 17 nov | `17292d2` | migración de producción a `us-west-2` y session pooler |
| 18 nov | `dca27b8` | análisis de Sonar por CI con cobertura real |
| 18 nov | `66c6816` | corrección de los tres hallazgos de la quality gate |
| 18 nov | `b77b04b` | diagramas UML, modelo de datos y plan de pruebas ampliado |
| 18 nov | `b45ef50` | ritmo de trabajo alineado con los 4 sprints de Jira |
| 20 nov | `17d444e` | **editor: crear un optimizador desde cero (CFG-05)** |
| 20 nov | `c66b41c` | estilo del editor, sin rayas largas en textos ni comentarios |
| 22 nov | `998f123` | cimientos para editar la plantilla |
| 22 nov | `cec1a57` | crear un atributo base (CFG-01) |
| 22 nov | `013e8b3` | cerrar los criterios pendientes de CFG-05 |
| 22 nov | `6cff5b7` | ver y validar la configuración de un juego (CFG-06) |
| 22 nov | `896debf` | cockpit con barra de setup y lista de resultados (6.3.5) |
| 23 nov | `3bd3e2a` | condiciones desde la barra y comparación plegada (6.3.5) |
| 23 nov | `97b46cf` | catálogo de juegos y géneros normalizado en Supabase |

Cada fila se verifica con `git merge-base --is-ancestor <hash> main`.

## Qué se puede demostrar con este incremento

1. **Despliegue verificado en producción**, con Supabase conectado y migrado a `us-west-2`.
2. **Docker construye y sirve la aplicación**, sin depender de Vercel para verificar.
3. **CI valida solo lo afectado**, audita dependencias y ejecuta análisis estático con cobertura.
4. **El editor existe y funciona.** Permite crear un optimizador desde cero (CFG-05), ver y validar
   su configuración (CFG-06) y crear atributos base (CFG-01).
5. **El cockpit del optimizador** reúne barra de setup, comparación plegada y lista de resultados
   (6.3.5).

## Pendiente al cierre

- Unificar la interfaz del optimizador (UI-01).
- Redirigir las rutas antiguas (TEC-23).
- Publicar la etiqueta `sprint-4` en GitHub.

## Fuera de alcance hasta el Capstone

- Eliminar el juego demo hardcodeado (TEC-22). La demo constituye la evidencia de la entrega y se
  retira cuando el proyecto continúe como Zenith Optimizer, no antes.

## Nota de trazabilidad

Se aplicaron dos correcciones al reconstruir este documento contra el repositorio:

1. **Hashes actualizados.** Las versiones anteriores citaban dos commits para CFG-05 y el ajuste de
   estilo que fueron reescritos al integrar la rama por rebase. En `main`, el mismo trabajo aparece
   como `17d444e` y `c66b41c`, que son los que se citan en la tabla y los que un evaluador puede
   verificar.
2. **Afirmación de despliegue corregida.** El CI valida, audita y ejecuta análisis estático, pero no
   despliega. El despliegue lo realiza Vercel mediante integración de Git. La fila de `8b3af7f`
   indicaba «y despliega», operación que el workflow no ejecuta.

CFG-05 quedó con código el 20 de noviembre y Jira todavía la muestra en «Por hacer». Se mantiene así
de forma deliberada. La historia se cierra cuando la funcionalidad está verificada en la versión
final y no cuando existe el primer commit. La discrepancia queda anotada para que no parezca un
descuido.
