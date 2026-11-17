# Documentación

Documentación técnica del proyecto. El `README.md` de la raíz es la puerta de entrada; acá
está el detalle que no cabe allí.

## Contenido

| Documento | Qué responde |
|---|---|
| [`arquitectura.md`](./arquitectura.md) | Cómo está construido y por qué el cálculo va al cliente |
| [`entornos.md`](./entornos.md) | Variables, ambientes y qué es público vs. secreto |
| [`configurar-despliegue.md`](./configurar-despliegue.md) | Paso a paso de Vercel y Supabase (dashboard) |
| [`estrategia-de-pruebas.md`](./estrategia-de-pruebas.md) | Qué se prueba, con qué y qué falta |
| [`definition-of-ready-done.md`](./definition-of-ready-done.md) | Cuándo una historia empieza y cuándo termina |
| [`ritmo-de-trabajo.md`](./ritmo-de-trabajo.md) | Cómo trabajó el equipo y cómo leer el historial de Git |
| [`decisiones/`](./decisiones/) | ADRs: por qué se eligió NX, cliente, Supabase, Docker y Vercel |

## Decisiones de arquitectura (ADR)

| ADR | Decisión |
|---|---|
| [001](./decisiones/001-monorepo-nx.md) | Monorepo con NX |
| [002](./decisiones/002-calculo-en-cliente.md) | El cálculo ocurre en el navegador |
| [003](./decisiones/003-supabase.md) | Supabase para cuentas y catálogo comunitario |
| [004](./decisiones/004-despliegue-docker.md) | Despliegue estático con Docker para verificación |
| [005](./decisiones/005-despliegue-vercel.md) | Desplegar con la integración de Git de Vercel |

Un ADR no se edita para reflejar la realidad actual: si una decisión cambia, se escribe uno
nuevo que la reemplaza y se marca el anterior como **sustituido**. Así queda el porqué, no
solo el qué.

## Otras fuentes

- **README de cada librería:** contrato público de `core-engine`, `data-access`,
  `inventory` y `shared-types`.
- **`supabase/README.md`:** esquema, migraciones y cómo probar RLS.
- **DeepWiki:** documentación generada desde el código, útil para ver el estado actual sin
  depender de que alguien actualice un documento a mano.
