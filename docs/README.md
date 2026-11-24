# Documentación del software

Documentación técnica de Zenith Optimizer. El `README.md` de la raíz constituye la puerta de
entrada, y en esta carpeta se encuentra el detalle que no cabe allí.

Esta carpeta describe **el software**: cómo está construido, cómo se despliega, qué modelo de
datos usa y cómo se prueba. Sirve igual durante el Capstone y después de él, porque no depende de
la asignatura.

La documentación de la asignatura —los sprints, los acuerdos de equipo y la entrega evaluada— está
en [`Fase 2/Evidencias/`](../Fase%202/Evidencias/README.md), fuera de esta carpeta.

## Contenido

| Documento | Qué responde |
|---|---|
| [`arquitectura.md`](./arquitectura.md) | cómo está construido: capas, componentes y despliegue |
| [`modelo-de-datos.md`](./modelo-de-datos.md) | modelo relacional, normalización y reglas de integridad |
| [`uml.md`](./uml.md) | diagrama de clases y secuencia de las dos funcionalidades principales |
| [`entornos.md`](./entornos.md) | variables, ambientes y qué es público frente a qué es secreto |
| [`configurar-despliegue.md`](./configurar-despliegue.md) | procedimiento paso a paso de Vercel y Supabase |
| [`estrategia-de-pruebas.md`](./estrategia-de-pruebas.md) | qué se prueba, con qué instrumento y qué falta |
| [`traspaso-category-a-generos.md`](./traspaso-category-a-generos.md) | migración pendiente del filtro de categorías a géneros |
| [`erd.html`](./erd.html) | diagrama entidad-relación interactivo |
| [`decisiones/`](./decisiones/) | ADR: por qué se eligió NX, el cálculo en el cliente, Supabase, Docker y Vercel |

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

El sexto ADR, sobre la cadencia de la daily, es una decisión de proceso y no de arquitectura. Se
conserva junto a los documentos de la asignatura, en
[`Fase 2/Evidencias/gestion/006-cadencia-daily.md`](../Fase%202/Evidencias/gestion/006-cadencia-daily.md).

## Otras fuentes

- **README de cada librería:** contrato público de `core-engine`, `data-access`, `inventory` y
  `shared-types`.
- **`supabase/README.md`:** esquema, migraciones y procedimiento para probar RLS.
- **DeepWiki:** documentación generada desde el código. Permite consultar el estado actual sin
  depender de que alguien actualice un documento manualmente.
