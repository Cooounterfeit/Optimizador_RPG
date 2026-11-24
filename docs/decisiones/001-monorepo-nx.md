# ADR 001: Monorepo con NX

**Estado:** aceptada · **Fecha:** septiembre 2026

## Contexto

El proyecto requiere al menos tres piezas con responsabilidades distintas. Una es una interfaz React. Otra es un motor de optimización sin dependencias de interfaz. La tercera es un contrato compartido entre ambos. Además,
el motor debe poder probarse sin montar un navegador.

## Decisión

Adoptar un monorepo con **NX**, con aplicaciones en `apps/` y librerías en `libs/`. Cada proyecto
mantiene su propia configuración de TypeScript.

```
apps/web              interfaz React + Vite
libs/core-engine      motor puro
libs/data-access      persistencia
libs/inventory        parseo de inventario
libs/shared-types     contrato
```

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Repositorio único sin separación | el motor quedaría acoplado a React, lo que impide probarlo de forma aislada |
| Varios repositorios | versionar el contrato entre repositorios exige trabajo manual y resulta frágil |
| Turborepo | es válido, pero NX incluye grafo de dependencias y `affected` sin configuración adicional |
| Un solo paquete con carpetas | sin límites de importación, la separación se degrada con el tiempo |

## Consecuencias

**Beneficios:**

- El motor se prueba sin navegador (182 pruebas en pocos segundos).
- `nx affected` valida solo lo modificado.
- El grafo (`nx graph`) expone las dependencias reales.

**Costos:**

- La configuración inicial es más compleja.
- Quien proviene de un repositorio plano debe comprender el grafo antes de mover archivos. El
  procedimiento se documenta en `README.md` y `CONTRIBUTING.md`.

**Restricción que impone.** `core-engine` no puede importar React ni acceder al DOM. Si alguna vez
lo requiere, el error está en la decisión y no en la restricción.
