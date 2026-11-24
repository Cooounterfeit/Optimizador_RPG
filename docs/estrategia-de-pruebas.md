# Estrategia de pruebas

El objetivo no consiste en acumular pruebas, sino en impedir que un cambio incorrecto llegue a
`main`. La pirámide está inclinada de forma deliberada hacia las pruebas unitarias del motor. Allí reside la lógica que puede fallar en silencio.

## Estado actual

| Proyecto | Archivos | Pruebas | Cobertura funcional |
|---|---|---|---|
| `libs/core-engine` | 10 | 182 | solver, fórmulas, curvas, validación |
| `apps/web` | 56 | 317 | componentes, hooks, flujos |
| `supabase` | 1 | 89 | esquema y RLS con PGlite |
| `libs/data-access` | 12 | 72 | repositorios Dexie, importación |
| `libs/inventory` | 6 | 29 | parseo y reglas de inventario |
| `libs/shared-types` | 3 | 11 | contrato Zod |
| **Total unitarias** | **88** | **700** | |
| `apps/web-e2e` | 7 | 27 | recorridos en navegador real |

Ejecución completa: `npx nx run-many -t test`. Ejecución de lo afectado: `npx nx affected -t test`.

## Niveles

### 1. Unitarias (Vitest)

El núcleo. `core-engine` es TypeScript puro, sin React ni DOM, precisamente para permitir esta ejecución. Los 182 casos corren en pocos segundos sin montar un navegador.

Contenido de las pruebas del motor:

- **Exactitud del solver.** `solver.spec.ts` compara `solve` contra `solveBruteForceTop`, una
  fuerza bruta deliberadamente simple que no comparte código con la versión optimizada. Si la poda
  se equivoca, los resultados divergen y la prueba falla. Es la verificación más importante del
  proyecto, porque demuestra que el término «óptimo» corresponde a un resultado demostrado.
- **Fórmulas y curvas.** Casos con valores conocidos, incluidas las curvas no monotónicas.
- **Contrato.** `validateTemplate` rechaza plantillas inválidas con el error correcto.

### 2. Integración

- **Repositorios sobre Dexie real** con `fake-indexeddb`. No se sustituye la base por un mock: se
  utiliza una implementación en memoria. Un mock habría ocultado errores de índices y
  transacciones.
- **Esquema y RLS contra PGlite** (`supabase/tests/rls.spec.ts`, 89 casos). Un Postgres real embebido aplica las migraciones. Verifica que cada política permita lo que corresponde y bloquee lo que no. Es la única forma de probar RLS sin un proyecto en la nube.

### 3. Extremo a extremo (Playwright)

Son 27 recorridos en siete archivos sobre el build real. Cubren importar inventario, optimizar, ver el resultado, hoja de personaje, catálogo, cuenta y navegación. Se ejecutan con `VITE_USE_MOCKS=1`
para no depender de datos ni de red.

En CI se ejecutan con Chromium. Ante un fallo se guardan screenshot, video y trace. Sin esa
evidencia, depurar un fallo de e2e en CI equivale a adivinar.

## Qué se prueba y qué no

| Se prueba | No se prueba |
|---|---|
| lógica del motor | estilos y clases CSS |
| contrato y validación | detalles de implementación de React |
| repositorios contra base real | librerías de terceros |
| flujos completos de usuario | cada variante visual |
| políticas RLS | rendimiento de carga real |

**Criterio.** Si el código contiene una decisión que puede estar equivocada, requiere prueba. Si
solo admite una forma de escribirse, no la requiere.

## Caja negra: casos derivados de los criterios de aceptación

Las pruebas anteriores examinan el código desde dentro. Las siguientes examinan la aplicación como la ve el usuario. Se ingresa por la interfaz, se ejecuta una acción y se compara el resultado observable, sin conocer la implementación. Cada caso proviene de un criterio de aceptación de una
historia de usuario, no de una función.

| Caso | Entrada | Resultado esperado | Origen |
|---|---|---|---|
| Registro válido | correo nuevo y contraseña de 8 o más caracteres | solicita confirmar el correo y no permite el ingreso | AUT-1 |
| Registro duplicado | correo ya existente | mensaje de cuenta existente, sin crear otra | AUT-1 |
| Contraseña corta | 6 caracteres | rechazo antes de llamar al servidor | AUT-1 |
| Login sin confirmar | cuenta pendiente | aviso de confirmar el correo, sin sesión | AUT-2 |
| Importar inventario GOOD | archivo de 2.622 objetos | inventario cargado y contado | INV-7 |
| Importar archivo corrupto | JSON truncado | error explícito, inventario intacto | INV-7 |
| Optimizar sin restricciones | objetivo Vida, 2.622 objetos | build con la puntuación más alta del conjunto | SIM-07 |
| Restricción imposible | mínimo de Defensa inalcanzable | mensaje de ausencia de combinación posible, no un resultado vacío | SIM-07 |
| Cancelar optimización | cancelar a mitad | resultado parcial marcado como no óptimo | SIM-07 |
| Votar dos veces | mismo usuario y optimizador | el segundo intento no duplica el voto | HUB-02 |
| Editar rol propio | usuario envía `role: admin` | la base de datos lo rechaza | seguridad |
| Leer inventario ajeno | consulta directa sin sesión | cero filas | seguridad |

Los casos de seguridad se automatizan en el proyecto `supabase` con PGlite. Los de interfaz se automatizan en las specs de Playwright o en las de componente. La elección depende de dónde resulte observable el comportamiento.

## Rendimiento: presupuesto explícito

Un solver que tarda cuarenta segundos es correcto y, aun así, inutilizable. Por esta razón existen
presupuestos medidos y no impresiones:

| Escenario | Presupuesto | Medición |
|---|---|---|
| Inventario de 200 objetos, objetivo lineal | menos de 2 s | prueba de `core-engine` sobre `solve` |
| Inventario de 2.622 objetos (caso Furina) | menos de 10 s con podado completo | prueba marcada como lenta |
| Comparación contra fuerza bruta | misma solución, sin excepción | `solver.spec.ts` |
| Interfaz durante la optimización | sin bloqueo perceptible | el cálculo corre en un Web Worker |

**El objeto de vigilancia es el podado, no solo el tiempo.** `SolveStats` informa cuántas
combinaciones existían, cuántas permanecieron tras el filtro y cuántas se descartaron por cota. Si el espacio explorado crece sin que crezca el resultado, el podado se rompió. El tiempo aún puede no delatarlo.

## Seguridad: vectores evaluados

| Vector | Intento | Defensa | Prueba |
|---|---|---|---|
| Escalar privilegios | actualizar el `role` propio | permiso por columna, no por fila | PGlite |
| Leer datos ajenos | `select` sobre el `cloud_inventory` de otro usuario | política RLS por `auth.uid()` | PGlite |
| Escribir sin sesión | `insert` como `anon` | `revoke` desde el inicio | PGlite |
| Suplantar autor | crear un optimizador con `author_id` ajeno | `default auth.uid()` y política | PGlite |
| Inyectar HTML en el nombre | `<script>` en `display_name` | React escapa el contenido; la base no lo requiere | componente |
| Exponer la clave de servicio | inspeccionar el bundle | la `service_role` nunca sale del servidor | revisión de build |
| Contraseña débil | 6 caracteres | mínimo de 8 en Supabase Auth | integración |

La `anon key` que viaja en el bundle no constituye una brecha: está diseñada para ser pública. Lo
que protege los datos son las políticas RLS, y por esta razón se prueban una por una. La clave `service_role` es la que nunca puede aparecer en el bundle. Su ausencia se verifica en la revisión de despliegue.

## Cobertura medida

Cada proyecto emite su `lcov.info` al ejecutarse con `--coverage`. La herramienta `tools/merge-coverage.mjs` los combina en `coverage/lcov.info` con rutas relativas a la raíz. Vitest escribe las rutas relativas a
la raíz de cada proyecto. Sin ese paso, Sonar no resuelve ningún archivo y la cobertura queda en
cero.

Última medición registrada, sobre el código del producto (sin `demo/`), del 20-nov-2026:

| Área | Líneas | Cubiertas | % |
|---|---|---|---|
| `apps/web` | 7.879 | 7.199 | 91,4 % |
| `libs/core-engine` | 2.973 | 2.696 | 90,7 % |
| `libs/data-access` | 856 | 697 | 81,4 % |
| `libs/inventory` | 327 | 312 | 95,4 % |
| `libs/shared-types` | 297 | 217 | 73,1 % |
| **Total** | **12.332** | **11.121** | **90,2 %** |

Los tipos generados desde Supabase quedan excluidos. No se escriben a mano, de modo que medirlos
solo reduce el porcentaje sin aportar información.

## Puertas de calidad

Ningún cambio ingresa a `main` sin superar las siguientes verificaciones:

1. `lint`: sin errores.
2. `typecheck`: sin errores de tipos.
3. `test`: 700 pruebas en verde.
4. `build`: el bundle de producción se genera.
5. `npm audit --omit=dev --audit-level=high`: sin vulnerabilidades altas en dependencias de
   producción.
6. e2e: los 27 recorridos pasan.

Todo se ejecuta en `.github/workflows/ci.yml` con `nx affected`. Se valida solo lo que el cambio
modificó, más sus dependientes.

## Brechas conocidas

| Brecha | Estado | Plan |
|---|---|---|
| Umbral de cobertura no fijado | abierto, cobertura medida en 90,2 % | fijar 70 % en `libs/` como condición de la puerta |
| Presupuesto de rendimiento declarado sin medición automática | abierto | medir en CI y fallar si se excede |
| Sin pruebas de accesibilidad | abierto | incorporar `@axe-core/playwright` en las specs e2e |
| Casos de caja negra documentados, no todos automatizados | abierto | trasladar la tabla a specs |

La prueba de interfaz que resultaba intermitente quedó corregida en el commit `275db33`, por sus
dos causas reales. Se retiró de esta tabla porque ya no constituye una brecha abierta.

Las brechas se documentan en lugar de omitirse. Una brecha conocida es deuda técnica; una ignorada
es un riesgo.
