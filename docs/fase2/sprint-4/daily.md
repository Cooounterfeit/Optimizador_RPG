# Sprint 4 — Daily (en curso)

**Ventana registrada:** 16 al 23 de noviembre de 2026. El sprint sigue abierto: Jira lo fecha
del 16 al 29.

Bitácora reconstruida desde las fechas de commit y el estado en Jira. No existió un daily
escrito; se declara para no presentar como acta lo que es una reconstrucción. El método y el
registro completo por día hábil están en [`../registro-cadencia.md`](../registro-cadencia.md).

## 16 de noviembre

- Sin cambios en el repositorio. El sprint arranca con 11 HUs propias; las 28 restantes llegan
  el 20 de noviembre, al ordenar Jira.

## 17 de noviembre

La jornada más cargada del proyecto: 24 commits no-merge.

- **Infraestructura y despliegue.** Docker (`96b6752`), CI que valida lo afectado y audita
  (`8b3af7f`), arquitectura, entornos y ADR (`e63a1fc`). Se verifica producción con Supabase
  conectado (`01e1e30`) y se migra a `us-west-2` con el session pooler documentado (`17292d2`).
- **Interfaz del optimizador, 6.3.1 a 6.3.4.** Workspace con rail de secciones (`b52d76f`),
  Overview como portada (`a0fcb94`), tarjeta de objeto al pasar el cursor (`b58b26d`) y tarjeta
  única de personaje (`d7a6a06`).
- **Seguridad y dependencias.** Se parchean `zod` y `react-router` por vulnerabilidades del
  bundle (`93364ff`); se devuelve el enlace de confirmación a la propia app (`3cf8e55`).

## 18 de noviembre

- **Calidad.** Análisis de Sonar por CI con cobertura real (`dca27b8`), corrección de los tres
  hallazgos de la quality gate (`66c6816`) y omisión del escaneo mientras no exista
  `SONAR_TOKEN` (`adc8ab4`).
- **Evidencia técnica.** Diagramas UML, modelo de datos y plan de pruebas ampliado (`b77b04b`).

## 19 de noviembre

- Documentos del Sprint 1 con evidencia gráfica (`244402f`).
- Se corrige la justificación de `--skip-nx-cache` en Sonar (`373ad57`).

## 20 de noviembre

Día de trazabilidad, no de producto.

- **Editor.** Entra `17d444e` — crear un optimizador desde cero (CFG-05). Es la primera HU de
  configuración con código en `apps/web`. El estilo del editor se ajusta en `c66b41c`.
- **Ordenamiento de Jira.** Se cierran los sprints 0 a 3, se activa el Sprint 4, se estiman las
  HUs que no tenían puntos y se asigna sprint a las que no tenían ninguno.
- **Verificación de la documentación.** Se revisan los cuatro sprints contra la API de Jira en
  lugar de contra el historial de commits (`a0b0def`, `d82f674`, `09a65f8`, `a2ac60b`,
  `086d48b`), y se corrigen las cifras que no se sostenían (`21e3a5c`).

## 22 de noviembre

- Editor: cimientos para editar la plantilla (`998f123`), atributo base (CFG-01, `cec1a57`),
  criterios pendientes de CFG-05 (`013e8b3`) y ver y validar la configuración de un juego
  (CFG-06, `6cff5b7`).
- Optimizador: cockpit con barra de setup y lista de resultados, 6.3.5 (`896debf`).
- Calidad: margen de espera de la prueba que el CI agotaba bajo carga (`c313d8f`).

## 23 de noviembre

- Condiciones desde la barra y comparación plegada, 6.3.5 (`3bd3e2a`), con sus correcciones de
  superficie (`2f0184a`, `e4bd3bd`).
- Catálogo de juegos y géneros normalizado en Supabase (`97b46cf`).
- Margen de 60 s por prueba bajo `nx affected` (`4c32a62`).

## Observación

El 20 de noviembre no fue de desarrollo de producto: fue de corrección de la trazabilidad. La
consecuencia es concreta: **desde ese día las cifras de los documentos y las de Jira son la
misma cosa**, en lugar de dos relatos que había que mantener sincronizados a mano.

Las entradas del 22 y 23 de noviembre se agregan al reconstruir la bitácora contra el
repositorio. Al escribirse las anteriores, el corte era el día 20 y esos commits todavía no
existían.
