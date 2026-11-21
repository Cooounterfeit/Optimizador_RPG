# Sprint 4 — Release (en curso)

**Estado:** sprint activo al 20 de noviembre de 2026. Este documento se completa cuando cierre el
22 o 23 de noviembre.

**Versión entregada:** sin etiqueta. El proyecto versiona por merge a `main`, no por tag.

## Qué entró a `main` desde el 16 de noviembre

| Fecha | Commit | Contenido |
|---|---|---|
| 17 nov | `b52d76f` | Workspace del optimizador con rail de secciones (6.3.1) |
| 17 nov | `f61545f` | La prueba del límite de tiempo mide lo enviado, no lo configurado |
| 17 nov | `77bfe37` | Base de Nx y versión de Node alineadas |
| 17 nov | `96b6752` | Construcción y servicio de la app con Docker |
| 17 nov | `8b3af7f` | CI valida solo lo afectado, audita dependencias y despliega |
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
| 20 nov | `5de1b84` | Estilo del editor: sin rayas largas en textos ni comentarios |
| 20 nov | `5c4cbe7` | **Editor: crear un optimizador desde cero (CFG-05)** |

## Qué se puede demostrar con este incremento

1. **Despliegue verificado en producción** con Supabase conectado, migrado a `us-west-2`.
2. **Docker construye y sirve la aplicación**, sin depender de Vercel para verificar.
3. **CI valida solo lo afectado**, audita dependencias y corre análisis estático con cobertura.
4. **El editor empieza a existir**: crear un optimizador desde cero ya tiene implementación.

## Pendiente al cierre

- Unificar la interfaz del optimizador (UI-01).
- Redirigir las rutas viejas (TEC-23).

## Fuera de alcance hasta el Capstone

- Eliminar el juego demo hardcodeado (TEC-22). **La demo es la evidencia de la entrega**: se retira
  cuando el proyecto continúe como Zenith Optimizer, no antes.

## Nota de trazabilidad

El commit `5c4cbe7` implementa CFG-05 y Jira todavía la muestra en «Por hacer». Se deja así a
propósito: la HU se cierra cuando la funcionalidad está verificada en la versión final, no cuando
existe el primer commit. La discrepancia queda anotada acá para que no parezca un descuido.
