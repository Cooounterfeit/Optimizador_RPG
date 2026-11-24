# Documentación

Documentación técnica del proyecto. El `README.md` de la raíz constituye la puerta de entrada. En
esta carpeta se encuentra el detalle que no cabe allí.

## Alcance

Todo el contenido de `docs/` corresponde a la entrega Capstone. Se trata de la versión universitaria del proyecto, que se presenta como **Optimizador RPG**. Si el producto continúa fuera de la facultad
como **Zenith Optimizer**, estas páginas no se actualizan para reflejar esa etapa. Describen lo que
se construyó y se decidió durante el Capstone. La versión final del software tendrá su propio
conjunto de documentos.

## Contenido

| Documento | Qué responde |
|---|---|
| [`arquitectura.md`](./arquitectura.md) | cómo está construido: capas, componentes y despliegue |
| [`modelo-de-datos.md`](./modelo-de-datos.md) | modelo relacional, normalización y reglas de integridad |
| [`uml.md`](./uml.md) | diagrama de clases y secuencia de las dos funcionalidades principales |
| [`entornos.md`](./entornos.md) | variables, ambientes y qué es público frente a qué es secreto |
| [`configurar-despliegue.md`](./configurar-despliegue.md) | procedimiento paso a paso de Vercel y Supabase |
| [`estrategia-de-pruebas.md`](./estrategia-de-pruebas.md) | qué se prueba, con qué instrumento y qué falta |
| [`definition-of-ready-done.md`](./definition-of-ready-done.md) | cuándo una historia comienza y cuándo termina |
| [`ritmo-de-trabajo.md`](./ritmo-de-trabajo.md) | cómo trabajó el equipo y cómo interpretar el historial de Git |
| [`traspaso-category-a-generos.md`](./traspaso-category-a-generos.md) | migración pendiente del filtro de categorías a géneros |
| [`epicas-2-3.md`](./epicas-2-3.md) | qué se construyó en las épicas de hub y editor, qué se decidió y en qué se aparta de los criterios |
| [`fase2/`](./fase2/README.md) | los cuatro sprints: planning, backlog, tablero, burndown, daily, impedimentos, release, review y retrospectiva |
| [`decisiones/`](./decisiones/) | ADRs: por qué se eligió NX, cliente, Supabase, Docker y Vercel |

## Decisiones de arquitectura (ADR)

| ADR | Decisión |
|---|---|
| [001](./decisiones/001-monorepo-nx.md) | monorepo con NX |
| [002](./decisiones/002-calculo-en-cliente.md) | el cálculo ocurre en el navegador |
| [003](./decisiones/003-supabase.md) | Supabase para cuentas y catálogo comunitario |
| [004](./decisiones/004-despliegue-docker.md) | despliegue estático con Docker para verificación |
| [005](./decisiones/005-despliegue-vercel.md) | despliegue mediante la integración de Git de Vercel |

Un ADR no se edita para reflejar la realidad actual. Si una decisión cambia, se redacta uno nuevo
que la reemplaza y se marca el anterior como **sustituido**. De esta forma queda registrado el
motivo y no solo la decisión vigente.

Decisiones de proceso, fuera del alcance de arquitectura:

| ADR | Decisión |
|---|---|
| [006](./decisiones/006-cadencia-daily.md) | cadencia de la daily: asíncrona, de 2 a 15 minutos |

## Otras fuentes

- **README de cada librería:** contrato público de `core-engine`, `data-access`, `inventory` y
  `shared-types`.
- **`supabase/README.md`:** esquema, migraciones y procedimiento para probar RLS.
- **DeepWiki:** documentación generada desde el código. Permite consultar el estado actual sin
  depender de que alguien actualice un documento manualmente.
