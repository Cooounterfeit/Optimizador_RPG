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
| `apps/web` | 38 | 198 | Componentes, hooks, flujos |
| `apps/web-e2e` | 7 | — | Recorridos en navegador real |
| **Total unitarias** | **64** | **520** | |

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

## Caja negra: casos derivados de los criterios de aceptación

Las pruebas anteriores miran el código por dentro. Estas miran la aplicación como la ve el
usuario: se entra por la interfaz, se ejecuta una acción y se compara el resultado observable,
sin conocer la implementación. Cada caso sale de un criterio de aceptación de una historia, no
de una función.

| Caso | Entrada | Resultado esperado | Origen |
|---|---|---|---|
| Registro válido | correo nuevo y contraseña de 8+ | pide confirmar el correo y no deja entrar todavía | AUT-1 |
| Registro duplicado | correo ya existente | mensaje de cuenta existente, sin crear otra | AUT-1 |
| Contraseña corta | 6 caracteres | rechazo antes de llamar al servidor | AUT-1 |
| Login sin confirmar | cuenta pendiente | aviso de confirmar el correo, sin sesión | AUT-2 |
| Importar inventario GOOD | archivo de 2.622 objetos | inventario cargado y contado | INV-7 |
| Importar archivo corrupto | JSON truncado | error explícito, inventario intacto | INV-7 |
| Optimizar sin restricciones | objetivo Vida, 2.622 objetos | build con la puntuación más alta del conjunto | SIM-07 |
| Restricción imposible | mínimo de Defensa inalcanzable | "no hay combinación posible", no un resultado vacío | SIM-07 |
| Cancelar optimización | cancelar a mitad | resultado parcial marcado como no óptimo | SIM-07 |
| Votar dos veces | mismo usuario y optimizador | el segundo intento no duplica el voto | HUB-02 |
| Editar rol propio | usuario envía `role: admin` | la base lo rechaza | seguridad |
| Leer inventario ajeno | consulta directa sin sesión | cero filas | seguridad |

Los casos de seguridad se automatizan en `supabase` con PGlite; los de interfaz, en las specs
de Playwright o en las de componente, según dónde esté el comportamiento observable.

## Rendimiento: presupuesto explícito

Un solver que tarda cuarenta segundos es correcto y aun así inutilizable. Por eso hay
presupuestos medidos, no impresiones:

| Escenario | Presupuesto | Cómo se mide |
|---|---|---|
| Inventario de 200 objetos, objetivo lineal | < 2 s | prueba de `core-engine` sobre `solve` |
| Inventario de 2.622 objetos (caso Furina) | < 10 s con podado completo | prueba marcada como lenta |
| Comparación contra fuerza bruta | misma solución, sin excepción | `solver.spec.ts` |
| Interfaz durante la optimización | sin bloqueo perceptible | el cálculo corre en Web Worker |

**Lo que se vigila es el podado, no solo el tiempo.** `SolveStats` reporta cuántas
combinaciones había, cuántas quedaron tras el filtro y cuántas se descartaron por cota. Si el
espacio explorado crece sin que crezca el resultado, el podado se rompió aunque el tiempo
todavía no lo delate.

## Seguridad: qué se intenta romper

| Vector | Intento | Defensa | Prueba |
|---|---|---|---|
| Escalar privilegios | actualizar `role` propio | permiso por columna, no por fila | PGlite |
| Leer datos ajenos | `select` sobre `cloud_inventory` de otro | política RLS por `auth.uid()` | PGlite |
| Escribir sin sesión | `insert` como `anon` | `revoke` desde el inicio | PGlite |
| Suplantar autor | crear optimizador con `author_id` ajeno | `default auth.uid()` + política | PGlite |
| Inyectar HTML en el nombre | `<script>` en `display_name` | React escapa; la base no lo necesita | componente |
| Exponer la clave de servicio | inspeccionar el bundle | la `service_role` nunca sale del servidor | revisión de build |
| Contraseña débil | 6 caracteres | mínimo 8 en Supabase Auth | integración |

La `anon key` que viaja en el bundle **no es una brecha**: está diseñada para ser pública. Lo
que protege los datos son las políticas RLS, y por eso se prueban una por una. La clave
`service_role` es la que nunca puede aparecer en el bundle, y hay una verificación de eso en
la revisión de despliegue.

## Puertas de calidad

Ningún cambio entra a `main` sin pasar:

1. `lint` — sin errores.
2. `typecheck` — sin errores de tipos.
3. `test` — 520 verdes.
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
| Presupuesto de rendimiento declarado, sin medición automática | Abierto | Medir en CI y fallar si excede |
| Sin pruebas de accesibilidad | Abierto | `@axe-core/playwright` en las specs e2e |
| Casos de caja negra documentados, no todos automatizados | Abierto | Llevar la tabla a specs |

Se documentan en lugar de omitirse: una brecha conocida es deuda técnica; una ignorada es un
riesgo.
