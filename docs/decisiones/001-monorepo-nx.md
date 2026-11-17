# ADR 001 — Monorepo con NX

**Estado:** aceptada · **Fecha:** septiembre 2026

## Contexto

El proyecto necesita al menos tres piezas con responsabilidades distintas: una interfaz
React, un motor de optimización sin dependencias de UI y un contrato compartido entre ambos.
Además, el motor debe poder probarse sin montar un navegador.

## Decisión

Un monorepo con **NX**, con proyectos en `apps/` y librerías en `libs/`, cada uno con su
propia configuración de TypeScript.

```
apps/web              UI React + Vite
libs/core-engine      motor puro
libs/data-access      persistencia
libs/inventory        parseo de inventario
libs/shared-types     contrato
```

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Repo único sin separación | El motor quedaría acoplado a React; imposible probarlo puro |
| Varios repositorios | Versionar el contrato entre repos es trabajo manual y frágil |
| Turborepo | Válido, pero NX ya trae grafo de dependencias y `affected` sin configurar |
| Un solo paquete con carpetas | Sin límites de importación, la separación se erosiona |

## Consecuencias

**Ganamos:** el motor se prueba sin navegador (142 pruebas en 10 s); `nx affected` valida
solo lo tocado; el grafo (`nx graph`) muestra las dependencias reales.

**Costamos:** configuración inicial más pesada; quien viene de un repo plano debe entender
el grafo antes de mover archivos. Documentado en `README.md` y `CONTRIBUTING.md`.

**Regla que impone:** `core-engine` no puede importar React ni tocar el DOM. Si algún día lo
necesita, la decisión está mal, no la regla.
