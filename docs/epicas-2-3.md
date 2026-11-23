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
| CFG-04 Eliminar un atributo | Hecha | `features/editor/StatDeleteRow.tsx` |
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
| `40cbc0e` | CFG-03. Editar en la fila, con aviso al cambiar la acumulación |
| `bd4b437` | CFG-04. Borrar con cascada hasta punto fijo |
| `4ef30a6` | El modelo de propiedad, escrito para la épica 2 |
| `4b8aefa` | Listar los borradores locales en la portada |
| `72c4f74` | Borrarlos, con la cuenta de piezas que se van con ellos |
| `3516e0b` | El menú de los tres puntos: renombrar, duplicar, borrar |
| `8eb7884` | Guardar el optimizador en la cuenta, privado o comunitario |
| `5f63bb9` | Cerrar el ciclo: la lista dice dónde vive cada borrador y se puede quitar de la cuenta |
| (este) | El botón de guardar, siempre visible, y la validación como condición |

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

### Dos guardados que no son lo mismo

El sistema guarda en dos sitios y confundirlos cuesta trabajo perdido, así que la pantalla
lo dice con palabras:

El **del navegador** es automático. Cada edición escribe en IndexedDB, no pide cuenta y no
sale de la máquina. Es lo que hace que cerrar la pestaña a media edición no cueste nada.

El **de la cuenta** es a botón. Sube la plantilla a Supabase bajo el `author_id` de quien
tiene la sesión, y por eso exige sesión: la política RLS cuelga de `auth.uid()`, y sin ella
el insert no tiene dueño a quien pertenecer. Sin sesión el botón no intenta guardar y
fallar: lleva a iniciar sesión y vuelve a donde estaba.

Lo que sube es la plantilla, es decir las estadísticas, las fórmulas y las reglas. **Los
objetos del jugador no viajan.** No es una limitación sino el reparto del sistema: la
matemática la construye el autor y la data de cada partida la pone cada uno, importándola
por JSON o escribiéndola a mano. El tipo `OptimizerDraft` no tiene por dónde recibir el
inventario, que es la única garantía de verdad de que no se filtre por descuido; una prueba
lo comprueba con un `@ts-expect-error`.

El vínculo entre el borrador local y su fila remota se guarda en la fila local
(`remoteId`). Sin él, cada clic insertaría un optimizador nuevo: el id local es un slug y
el remoto un uuid, y no hay forma de reconocer que son el mismo. Se escribe DESPUÉS de que
la nube confirme, porque al contrario un fallo de red dejaría un `remoteId` que no existe y
el guardado siguiente intentaría actualizar una fila fantasma.

Quién lo ve lo decide el autor, no el sistema: un optimizador a medio hacer en el catálogo
es tan malo como uno terminado que nadie encuentra.

### Guardar deja rastro en dos sitios, y borrar tiene que saberlo

El guardado en la cuenta abrió un fallo que no existía antes: borrar un borrador limpiaba
IndexedDB y dejaba la fila de Supabase **inalcanzable para siempre**. El vínculo entre las
dos copias (`remoteId`) vive en la fila local, así que borrarla primero es borrar el único
hilo que llevaba a la otra.

El orden de las operaciones es la corrección, y no es intercambiable: **primero la nube,
después lo local**. Si la nube falla, el borrador sigue aquí con su vínculo intacto y se
puede reintentar. Al revés, un fallo de red dejaría exactamente la basura que se quería
evitar. Hay una prueba que fija ese orden simulando una caída de red.

De ahí salen las otras dos piezas: la lista tiene que **decir dónde vive** cada borrador,
porque la nota "solo en este navegador" dejó de ser cierta el día que apareció el botón de
guardar; y tiene que existir una forma de **quitarlo de la cuenta sin borrarlo**, porque son
dos guardados distintos y deshacer uno no tiene por qué llevarse el otro.

`unlinkRemote` es un método propio del repositorio y no un `save` con el campo vacío, porque
`save` fusiona con `??`: pasarle `remoteId: undefined` conserva el anterior. Eso es lo
correcto al guardar y justo lo contrario de lo que hace falta al desvincular.

### Un botón que desaparece no explica nada

El botón de guardar se escondía en dos casos: sin cuentas configuradas, y en cualquier
situación en la que no se pudiera guardar. Visto desde fuera, el resultado era peor que un
botón inútil: quien lo buscaba y no lo encontraba concluía que el guardado no existía, o que
ya había pasado solo.

La regla ahora es que **el botón está siempre**. Cuando no se puede guardar, sigue en
pantalla, apagado, y debajo dice exactamente por qué. Eso obligó a arreglar algo más de
fondo: el componente de botón solo quitaba el puntero al deshabilitarse, sin ningún cambio
visual, así que en toda la aplicación un botón apagado parecía pulsable.

La única excepción es iniciar sesión, que no es un motivo para apagar nada: ahí el botón
está encendido y lleva a iniciarla, porque es una acción posible y no un muro.

**Guardar exige que la validación esté limpia.** No es una segunda opinión: el panel recibe
hecho el veredicto que la propia pantalla ya pinta más abajo, los bloques obligatorios vacíos
y los errores del motor. Un optimizador incompleto que llegara al catálogo sería algo que
nadie puede ejecutar. Mientras el informe se está calculando tampoco se guarda, porque lo que
hay en pantalla todavía no corresponde a esta plantilla.

Las razones no se repiten: en un optimizador recién creado los bloques vacíos son
justamente la causa de los errores del motor, así que se dice una vez.

### El modelo de propiedad

Decidido por el equipo y ya implementado en la base de datos desde la migración
inicial. La épica 2 no lo inventa: lo expone.

| Regla | Dónde vive hoy |
|---|---|
| Los borradores viven en este navegador | IndexedDB, vía `games.repo` y `localSource` |
| Lo que sube a la base es la configuración del optimizador | `optimizers.template` |
| El autor decide si es comunitario | `optimizers.published`, en el `grant update` |
| Ese interruptor lo mueven el autor y los administradores | `optimizers_update`, con `is_admin()` |
| Nadie más puede borrarlo | `optimizers_delete` |
| Editar algo ajeno produce una copia | `forked_from`, en el `grant insert` |

Dos detalles que ya estaban bien resueltos y conviene no romper: el `grant update`
enumera columnas y **`author_id` no está entre ellas**, así que ni el autor puede
regalar la autoría; y `forked_from` tiene `on delete set null`, así que una copia
sobrevive al borrado de su original y solo pierde el puntero.

Lo que falta es todo de la aplicación. `apps/web` conoce el tipo
`role: 'user' | 'admin'` y no lo lee en ningún sitio, y nunca pregunta quién eres
para decidir si puedes editar.

Eso le da a `editable` su forma definitiva, que hoy es una aproximación local:

1. Borrador local, tuyo. Se edita en el sitio.
2. Remoto y eres el autor o un administrador. Se edita en el sitio, cuando exista
   el camino de escritura a Supabase.
3. Remoto y no eres ninguno de los dos. No se edita: se ofrece copiarlo. La copia
   nace como borrador local con `forkedFrom` apuntando al original, y puedes
   publicarla como tuya.

El tercer caso encaja con el resto del producto sin forzar nada: la copia aterriza
en tu IndexedDB como cualquier otro borrador.

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

### CFG-04

| Criterio | Por qué no |
|---|---|
| Historial de deshacer hasta 10 acciones | Es una funcionalidad propia, cercana a CFG-16. Sin ella, la confirmación es la única red: por eso lista exactamente qué desaparece en vez de dar un número |

El borrado en cascada **sí** se implementó como pide el criterio, con una
salvedad que el criterio no contempla: **encadena**. Si cae el derivado `dps`
porque usaba `atk`, un objetivo con la fórmula `dps * 2` queda apuntando a una
variable que ya no existe. `cascadeOf` resuelve la cadena hasta punto fijo antes
de tocar nada, y hay pruebas con tres derivados seguidos.

El inventario no se toca. Las piezas son del usuario, no de la plantilla, y el
motor ya ignora con un aviso las estadísticas que no conoce.

Y donde el criterio no decía nada: si tras el borrado el optimizador deja de
poder buscar, se avisa antes. No se bloquea, porque la plantilla es del autor,
pero borrarle su único objetivo en silencio sería dejar que se rompa de lado.

### CFG-05

Tres criterios quedaron fuera y los tres dependen de sesión, o sea de la épica 2: asociar
el optimizador al usuario autenticado, guardar el estado "Configuración incompleta" y que
aparezca en la lista sin recargar (hoy se navega al editor).

El tercero estaba **mal clasificado y era un fallo de verdad**: nada en la interfaz
listaba los borradores locales, así que se creaba un optimizador, se entraba, y al volver
al menú desaparecía de la vista. Seguía en IndexedDB y solo se llegaba escribiendo la URL
de memoria. No dependía de sesión: `games.list()` estaba ahí desde siempre. Arreglado.

Sobre el primero conviene ser preciso, porque se decidió dos veces. Se construyó local y
sin cuenta a propósito, y el equipo confirmó después que los borradores locales se quedan:
lo que exige sesión no es crear, es **publicar**. El optimizador adquiere autor al subirse,
no al nacer. Así que ese criterio no está incumplido, está repartido entre las dos épicas.

### Pendientes de acordar con el equipo

- **El deshacer de diez pasos de CFG-04.** Es una funcionalidad propia, cercana a CFG-16.
  Mientras no exista, el borrado no se puede revertir y la confirmación es la única red.
- **CFG-03 y las referencias.** El criterio dice que al renombrar se actualicen las
  variables que usaban el nombre antiguo. En este modelo las fórmulas referencian por `id`,
  no por nombre, así que renombrar no rompe nada y ese criterio ya se cumple. Lo que sí
  rompería es cambiar el `id`, y eso ninguna de las cuatro historias lo cubre.

## Lo que queda

La épica 3 queda cerrada: CFG-01 a CFG-05 están hechas. Pero un juego creado aquí
**todavía no puede buscar**: `missingRequired` exige cuatro bloques y solo uno se volvió
editable. Faltan ranuras, objetivos y personajes, que no estaban en estas historias.

Lo siguiente es la épica 2, el hub.

**Pendiente de aplicar:** la migración `20261123000001_nombre_de_cien.sql` sube el nombre
del optimizador de 80 a 100 caracteres en la base. Hasta que corra contra la base
hospedada, un nombre de más de 80 se guarda en el navegador y falla al subirlo a la cuenta,
y el error de Postgres sale debajo del botón.

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
| Pruebas en `apps/web` | 386 |
| Pruebas en `libs/core-engine` | 189 |
| Cobertura sobre código nuevo | 94.5 % |

La cobertura está medida como la mide la puerta de calidad: solo sobre líneas añadidas.

### Una prueba intermitente conocida

`apps/web/src/app/OptimizerPage.spec.tsx` falla de forma esporádica cuando la suite corre
bajo carga, con una frecuencia observada de 2 de cada 10 corridas completas, y afecta a
tres pruebas distintas del mismo archivo. Una de ellas falló a 5246 ms contra el límite de
5000 ms que fija el propio archivo: el arreglo previo subió el techo y la lentitud de fondo
lo sigue superando. Esas pruebas ejecutan búsquedas reales del motor; doblarlo, como se
hizo en `ConfigurationPage.spec.tsx`, las volvería deterministas.
