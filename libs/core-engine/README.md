# core-engine

Motor genérico de optimización (TEC-12). Es TypeScript puro: no depende de React, del DOM ni del
almacenamiento. Consume el contrato de juego de `@zenith/shared-types` y devuelve la mejor
combinación de objetos para un objetivo, con óptimo demostrado.

## Pruebas

```bash
npx nx test core-engine
```

Ejecuta las pruebas unitarias con [Vitest](https://vitest.dev/). Son 182 casos en 9 archivos, y se
ejecutan sin montar un navegador.

## API pública

`src/index.ts` re-exporta las siguientes funciones:

- **Solver:** `solve`, `solveBruteForceTop`, `explainBuild`, `topoSortDerived`,
  `findMonotonicViolation`.
- **Validación:** `validateTemplate`.
- **Evaluación:** `evaluar`, `scorer`, `conBase`, `conDelta`, `evaluateCalculator`.
- **Progresión:** `currentLevel`, `futureLevels`, `projectProfile`, `allocatePoints`.
- **Sincronización:** `planSync`.

## Restricción de diseño

El motor no accede al DOM ni al almacenamiento. Esta restricción permite probarlo de forma aislada
y garantiza que el mismo binario sirva a cualquier juego. Si una funcionalidad requiere acceso al
entorno, corresponde ubicarla en `apps/web` o en `data-access`, no aquí.
