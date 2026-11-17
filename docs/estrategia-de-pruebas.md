# Estrategia de pruebas

El objetivo no es tener muchas pruebas: es que **un cambio equivocado no pueda llegar a
`main`**. La pirámide está inclinada a propósito hacia las pruebas unitarias del motor,
porque ahí vive la lógica que puede estar mal de forma silenciosa.

## Estado actual

| Proyecto | Archivos | Pruebas | Qué cubre |
|---|---|---|---|
| `libs/core-engine` | 7 | 142 | Solver, fórmulas, curvas, validación |
| `libs/data-access` | 11 | 72 | Repositorios Dexie, importación |
| `libs/inventory` | 5 | 29 | Parseo y reglas de inventario |
| `libs/shared-types` | 2 | 11 | Contrato Zod |
| `supabase` | 1 | 68 | Esquema y RLS con PGlite |
| `apps/web` | 37 | 192 | Componentes, hooks, flujos |
| `apps/web-e2e` | 7 | — | Recorridos en navegador real |
| **Total unitarias** | **63** | **514** | |

Ejecución: `npx nx run-many -t test`. Solo lo afectado: `npx nx affected -t test`.

## Niveles

### 1. Unitarias (Vitest)

El núcleo. `core-engine` es TypeScript puro —sin React, sin DOM— precisamente para poder
probarlo así: 142 casos corren en 10 segundos sin montar un navegador.

**Lo que se prueba en el motor:**

- **Exactitud del solver.** `solver.spec.ts` compara `solve` contra `solveBruteForceTop`, una
  fuerza bruta deliberadamente ingenua que no comparte código con el optimizado. Si la poda
  se equivoca, los resultados divergen y la prueba falla. Es la verificación más importante
  del proyecto: demuestra que "óptimo" significa óptimo.
- **Fórmulas y curvas.** Casos con valores conocidos, incluidas las no monotónicas.
- **Contrato.** `validateTemplate` rechaza plantillas inválidas con el error correcto.

### 2. Integración

- **Repositorios sobre Dexie real** con `fake-indexeddb`: no se mockea la base, se usa una
  implementación en memoria. Un mock habría ocultado errores de índices y transacciones.
- **Esquema y RLS contra PGlite** (`supabase/tests/rls.spec.ts`, 68 casos): un Postgres real
  embebido que aplica las migraciones y verifica que cada política permita lo que debe y
  bloquee lo que no. Es la única forma honesta de probar RLS sin un proyecto en la nube.

### 3. Extremo a extremo (Playwright)

Siete recorridos sobre el build real: importar inventario, optimizar, ver resultado, hoja de
personaje, catálogo, cuenta y navegación. Corren con `VITE_USE_MOCKS=1` para no depender de
datos ni de red.

En CI se ejecutan con Chromium. En fallo se guardan screenshot, video y trace: sin esa
evidencia, depurar un fallo de e2e en CI es adivinar.

## Qué se prueba y qué no

| Se prueba | No se prueba |
|---|---|
| Lógica del motor | Estilos y clases CSS |
| Contrato y validación | Detalles de implementación de React |
| Repositorios contra base real | Librerías de terceros |
| Flujos completos de usuario | Cada variante visual |
| Políticas RLS | Rendimiento de carga real |

**Criterio:** si el código tiene una decisión que puede estar mal, va prueba. Si solo tiene
una forma de escribirse, no.

## Puertas de calidad

Ningún cambio entra a `main` sin pasar:

1. `lint` — sin errores.
2. `typecheck` — sin errores de tipos.
3. `test` — 514 verdes.
4. `build` — el bundle de producción se genera.
5. `npm audit --omit=dev --audit-level=high` — sin vulnerabilidades altas en dependencias
   de producción.
6. e2e — los siete recorridos pasan.

Todo corre en `.github/workflows/ci.yml` con `nx affected`: se valida solo lo que el cambio
tocó, más sus dependientes.

## Brechas conocidas

| Brecha | Estado | Plan |
|---|---|---|
| Umbral de cobertura no fijado | Abierto | 70% en `libs/` |
| Una spec e2e es inestable en corrida completa | Abierto | Aislar estado entre archivos |
| Sin pruebas de rendimiento formalizadas | Abierto | Presupuesto de tiempo sobre el solver |
| Sin pruebas de accesibilidad | Abierto | `@axe-core/playwright` en las specs e2e |

Se documentan en lugar de omitirse: una brecha conocida es deuda técnica; una ignorada es un
riesgo.
