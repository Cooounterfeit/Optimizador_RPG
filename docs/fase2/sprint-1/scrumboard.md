# Sprint 1 — Scrumboard

![Tablero del Sprint 1 al cierre](./scrumboard.png)

> **Render, no captura.** Generado a partir de los datos de la API de Jira
> (`sprint = 5`, "Sprint 1 — Prototipo y motor"), no es una captura de pantalla. Las HUs, los
> estados y los puntos coinciden con lo que devuelve la consulta; el render existe para que la
> imagen quede versionada y no dependa de una sesión autenticada.
>
> Verificado el 20 de noviembre de 2026: 13 HUs, 35 puntos, 11 en Listo y 2 en Por hacer.

## Columnas

| Columna | HUs |
|---|---|
| **Por hacer** | ZO-11 (CFG-05), ZO-12 (CFG-06) |
| **En curso** | — |
| **En revisión** | — |
| **Listo** | ZO-30, ZO-31, ZO-39, ZO-60, ZO-62, ZO-71, ZO-79, ZO-80, ZO-81, ZO-82, ZO-83 |

## Flujo de trabajo

```
Por hacer  →  En curso  →  En revisión  →  Listo
```

La columna **En revisión** existe para PRs abiertos con CI en verde pero sin merge. En este
sprint no se usó: los dos PRs entraron directos porque no había otros revisores además del
autor.

## Distribución por épica

| Épica | HUs listas | HUs abiertas |
|---|---|---|
| Técnica (TEC) | 2 | — |
| Daño por golpe (DPG) | 5 | — |
| Autenticación (AUT) | 2 | — |
| Inventario (INV) | 1 | — |
| Investigación (SP) | 1 | — |
| Configuración (CFG) | — | 2 |

## Observación

Once de trece HUs cerraron y todas las épicas con alcance técnico quedaron completas. Lo
abierto es de **producto** (editor de configuración), no de motor ni de decisión. Eso explica
que el sprint cumpliera su objetivo declarado aunque no cerrara el 100 % del alcance.
