# Épicas 2 y 3: hub y editor de plantillas

**Estado:** en curso · **Última actualización:** 23 de noviembre de 2026

Qué se construyó en estas dos épicas, qué se decidió por el camino y qué quedó fuera. El
detalle de cada cambio está en el mensaje de su commit; acá está lo que no cabe ahí: las
decisiones y, sobre todo, **en qué se aparta la implementación de los criterios de
aceptación y por qué**.

> **Cómo se mantiene.** Cada PR de estas épicas agrega su fila en la tabla de abajo y, si
> cambia algo visible, su línea en [`CHANGELOG.md`](../CHANGELOG.md). Las divergencias con
> los criterios se anotan cuando se descubren, no al final.

## Alcance

La épica 3 llega hasta CFG-05. La épica 2 es el hub, que empieza cuando la 3 cierre.

| Historia | Estado | Dónde |
|---|---|---|
| CFG-01 Crear un atributo base | Hecha | `features/editor/StatsEditor.tsx` |
| CFG-02 Ver el listado de atributos | Hecha | `features/editor/BlockSection.tsx` |
| CFG-03 Editar un atributo | Hecha | `features/editor/StatEditRow.tsx` |
| CFG-04 Eliminar un atributo | Pendiente | |
| CFG-05 Crear un juego desde cero | Hecha | `features/editor/CreateOptimizerPage.tsx` |

CFG-06 (ver y validar la configuración) no es de esta épica pero se construyó aquí, porque
sin una pantalla que muestre el estado de la plantilla no había dónde colgar el editor.

## Lo construido

| Commit | Qué aporta |
|---|---|
| `17d444e` | CFG-05. Crear un juego vacío pero válido, sin pedir cuenta |
| `c66b41c` | Quitar rayas largas de textos y comentarios |
| `56cd74a` | CFG-06. Primera pantalla que consume `validateTemplate` |
| `3a7aaed` | Pasarle el inventario al motor: nueve comprobaciones que no corrían |
| `19cc585` | Cerrar cinco criterios de CFG-05 que faltaban |
| `10bba76` | Cimientos: `statReferences` y el camino único de escritura |
| `e084013` | CFG-01, y el guardián de ids en el motor |
| `a1a6097` | Quitar duplicación antes de que se triplicara |
| `2f16ea7` | Lo que marcaría el análisis estático |
| `b5d69a2` | CFG-02. Búsqueda, orden y estado de uso |
| `6934864` | Esta bitácora y las entradas de changelog que faltaban |
| (este) | CFG-03. Editar en la fila, con aviso al cambiar la acumulación |

### Tres hallazgos que no se buscaban

**Nueve comprobaciones escritas y nunca ejecutadas.** El motor tiene 54 comprobaciones y
nueve solo corren si se le pasa el inventario (`E_RANURA_VACIA`, `E_REQUISITO`,
`W_STAT_DESCONOCIDA` y seis más). CFG-06 llamaba a `validateTemplate(template)` sin ese
argumento, así que estaban probadas en el motor pero no se ejecutaban desde la aplicación.
El espacio de búsqueda también se calcula solo ahí, y por eso salía siempre `n/a`.

**Los ids de estadística no se validaban.** Un id acaba siendo el nombre de una variable
dentro de las fórmulas, y el tokenizador solo entiende identificadores. `validateTemplate`
miraba duplicados pero no la forma, así que una plantilla con `ataque-critico` validaba sin
una queja y rompía después, en otro sitio: el tokenizador lo lee como una **resta**. La
regla ya existía para los nodos de habilidad en `skills.ts`; las estadísticas se habían
quedado fuera. Ahora vive en `libs/core-engine/src/lib/ids.ts` y la emite el validador, así
que cubre también los paquetes importados y las plantillas escritas a mano.

**La cache local era de solo escritura.** `useGame` guardaba en IndexedDB todo lo que
cargaba, pero nadie lo leía. Al leerla, un juego creado desde el editor se abre sin haberlo
publicado y uno visto antes se abre sin red.

## Decisiones

### El atributo no tiene mínimo ni máximo

`StatDefSchema` se queda como está. Un tope en el esquema sería una constante, y los topes
reales dependen del nivel: en WoW la habilidad de Defensa tope a `nivel * 5`, no a un
número. Eso ya se puede expresar donde corresponde, en `leveling`, en un `derived` o en una
fórmula con `min` o `clamp`, que el motor ya soporta.

Cae con esto: los campos de rango de CFG-01, la validación de mínimo mayor que máximo, la
columna de rango de CFG-02 y la advertencia por reducir el rango de CFG-03.

### La unidad sí es obligatoria

El esquema exige `flat` o `percent` y el motor no calcula sin ella. La historia no la
menciona. El formulario la pide igual, porque no hay alternativa.

### La acumulación se pide al crear, aunque la historia no la pida

Es si dos piezas con +30 dan 60 o dan 1,69. Equivocarse no produce un error: produce
números malos en silencio. Obligar a crear primero y corregir después es peor que un campo
plegado con su valor habitual puesto.

### El id tampoco se edita

Renombrar lo visible es gratis: las fórmulas referencian por `id`, así que el
criterio de CFG-03 sobre no romper referencias se cumple solo, por un motivo
distinto del que la historia supone. Cambiar el `id` sí rompería, y hacerlo bien
exige reescribir las fórmulas, o sea el serializador de árbol a texto que todavía
no existe. Queda para cuando exista.

Donde el criterio pide avisar al reducir el rango, el riesgo equivalente en este
modelo es cambiar **cómo acumula** una estadística que ya se usa: dos piezas con
+30 pasan de dar 60 a dar 1,69, y eso cambia todos los resultados sin un solo
error. Ese es el aviso que se da, con el número de sitios afectados, contando
también las piezas del inventario, y con confirmación explícita.

### El id se genera y no se muestra en el formulario

Se deriva del nombre con `suggestStatId`, en camelCase y respetando la convención del guion
bajo final para las porcentuales (`hp` y `hp_`), que es la que usan las diez plantillas de
ejemplo. No se usa `slugify`, que es la función del id de un juego, porque separa con
guiones y un guion dentro de una fórmula es una resta.

No se pregunta porque hoy no hay ningún sitio en la aplicación donde escribir una fórmula.
Se ve en el listado. Si el editor de fórmulas por bloques llega a existir, el autor
seguirá sin teclearlo.

### Un bloque solo se edita si lo guardado se va a poder volver a leer

`editable` es exacto, no una aproximación: se guarda bajo `template.gameId` y el origen
local lee por el id de la URL, así que tienen que coincidir, y el id no puede ser un uuid
porque entonces el origen remoto resuelve primero y taparía la copia local. Dicho de otro
modo, un optimizador del catálogo todavía no se edita, y eso depende de la épica 2.

### Registros en vez de condiciones encadenadas

Tres, y cada uno tiene miembros reales:

- `features/game/sources.ts`: de dónde sale una plantilla.
- `features/editor/blocks.ts`: qué partes tiene y cómo listarlas. Dato puro, sin React.
- `features/editor/block-editors.tsx`: cuál de esas partes ya se edita.

El motivo es el mismo en los tres: las historias que quedan añaden una entrada cada una en
vez de pelearse por el mismo bloque de condiciones.

## Divergencias con los criterios de aceptación

Lo que no se implementó, por historia. Nada de esto es un olvido.

### CFG-01

| Criterio | Por qué no |
|---|---|
| Valor mínimo y valor máximo | No existen en el modelo, por la decisión de arriba |
| "El valor mínimo no puede ser mayor al máximo" | Depende de lo anterior |

### CFG-02

| Criterio | Por qué no |
|---|---|
| Rango numérico en el listado | No existe en el modelo |
| Fecha de creación y de modificación | No existen por atributo. La tabla `optimizers` las tiene para el optimizador entero, y la plantilla es un solo blob JSON |
| Ordenar por esas fechas | Depende de lo anterior. En su lugar se ofrece volver al orden de la plantilla |
| Refresco automático ante cambios en la BD | Es tiempo real de Supabase. Para un juego local no hay base de datos que escuchar |

### CFG-03

| Criterio | Por qué no |
|---|---|
| Valor mínimo y valor máximo precargados | No existen en el modelo |
| Advertencia por reducir el rango | Depende de lo anterior. En su lugar se avisa al cambiar la acumulación, que es el riesgo equivalente |
| Fecha de última modificación | No existe por atributo |

### CFG-05

Tres criterios quedaron fuera y los tres dependen de sesión, o sea de la épica 2: asociar
el optimizador al usuario autenticado, guardar el estado "Configuración incompleta" y que
aparezca en la lista sin recargar (hoy se navega al editor).

### Pendientes de acordar con el equipo

- **El borrado en cascada de CFG-04.** Tal como está escrito, borrar un atributo borraría el
  objetivo que lo usa, y un juego sin objetivos no puede optimizar. El autor podría dejarse
  el optimizador inservible con dos clics. La alternativa es bloquear y mostrar qué hay que
  desenganchar primero, pero eso contradice el criterio.
- **El deshacer de diez pasos de CFG-04.** Es una funcionalidad propia, cercana a CFG-16.
- **CFG-03 y las referencias.** El criterio dice que al renombrar se actualicen las
  variables que usaban el nombre antiguo. En este modelo las fórmulas referencian por `id`,
  no por nombre, así que renombrar no rompe nada y ese criterio ya se cumple. Lo que sí
  rompería es cambiar el `id`, y eso ninguna de las cuatro historias lo cubre.

## Lo que queda

Al cerrar la épica 3 se podrá crear un juego y definirle sus atributos, pero **ese juego
todavía no podrá buscar**: `missingRequired` exige cuatro bloques y solo uno se vuelve
editable. Faltan ranuras, objetivos y personajes, que no están en CFG-01 a CFG-05.

Fuera de la épica, anotado para cuando toque: mover `app/OptimizerPage.tsx` a
`features/optimizer/`, porque importa doce cosas de `features/` y cero de `app/`, y el
editor de fórmulas por bloques, cuyo modelo de datos ya existe (`FormulaNode` en
`formula.ts`) y cuya parte delicada es serializar el árbol a texto con los paréntesis
correctos.

## Verificación

Cada commit pasa la misma puerta antes de entregarse: `test`, `lint`, `typecheck` y `build`
en los siete proyectos, más `check:genres`.

| Métrica | Valor |
|---|---|
| Pruebas en `apps/web` | 295 |
| Pruebas en `libs/core-engine` | 174 |
| Cobertura sobre código nuevo | 94.5 % |

La cobertura está medida como la mide la puerta de calidad: solo sobre líneas añadidas.

### Una prueba intermitente conocida

`apps/web/src/app/OptimizerPage.spec.tsx` falla de forma esporádica cuando la suite corre
bajo carga, con una frecuencia observada de 2 de cada 10 corridas completas, y afecta a
tres pruebas distintas del mismo archivo. Una de ellas falló a 5246 ms contra el límite de
5000 ms que fija el propio archivo: el arreglo previo subió el techo y la lentitud de fondo
lo sigue superando. Esas pruebas ejecutan búsquedas reales del motor; doblarlo, como se
hizo en `ConfigurationPage.spec.tsx`, las volvería deterministas.
