# Sprint 1 — Scrumboard

![Tablero del Sprint 1 al cierre](./scrumboard.png)

> **Imagen renderizada desde los datos de Jira**, no una captura del tablero. Muestra las mismas
> HUs, columnas y puntos que devuelve la API para
> `project = ZO AND sprint = "Sprint 1 — Prototipo y motor"`, pero se genera a partir de esos datos
> para que quede versionada y no dependa de una sesión autenticada.

## Columnas

| Columna | HUs |
|---|---|
| **Por hacer** | ZO-11 (CFG-05), ZO-12 (CFG-06) |
| **En curso** | ZO-71 (SP-02) |
| **En revisión** | — |
| **Listo** | ZO-30, ZO-31, ZO-39, ZO-60, ZO-62, ZO-79, ZO-80, ZO-81, ZO-82, ZO-83 |

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
| Configuración (CFG) | — | 2 |
| Investigación (SP) | — | 1 |

## Observación

Diez de trece HUs cerraron y todas las épicas con alcance técnico quedaron completas. Lo
abierto es de **producto** (editor de configuración) y **decisión** (Supabase), no de motor.
Eso explica que el sprint cumpliera su objetivo declarado aunque no cerrara el 100 % del
alcance.
