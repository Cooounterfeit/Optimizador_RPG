# core-engine

Motor generico de optimizacion (TEC-12). TypeScript puro: sin React, sin DOM y sin
almacenamiento. Consume el contrato de juego de `@zenith/shared-types` y devuelve la mejor
combinacion de objetos para un objetivo, con optimo demostrado.

## Running unit tests

Run `nx test core-engine` to execute the unit tests via [Vitest](https://vitest.dev/).

## API publica

`src/index.ts` re-exporta `solve`, `solveBruteForceTop`, `explainBuild`, `validateTemplate`,
`evaluar`, `scorer`, `conBase`, `conDelta` y `planSync`.
