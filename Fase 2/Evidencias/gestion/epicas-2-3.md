# Épicas 2 y 3: hub y editor de plantillas

**Estado:** en curso · **Última actualización:** 23 de noviembre de 2026

Este documento registra qué se construyó en las dos épicas, qué se decidió durante el trabajo y qué
quedó fuera. El detalle de cada cambio reside en el mensaje de su commit. Aquí se documentan las
decisiones y, sobre todo, la forma en que la implementación se aparta de los criterios de
aceptación, junto con su justificación.

> **Cómo se mantiene.** Cada pull request de estas épicas agrega su fila en la tabla siguiente y, si
> modifica algo visible, su línea en [`CHANGELOG.md`](../../../CHANGELOG.md). Las divergencias con los
> criterios se anotan cuando se descubren y no al final.

## Alcance

La épica 3 llega hasta CFG-05. La épica 2 corresponde al hub y comienza cuando la 3 cierre.

| Historia | Estado | Ubicación |
|---|---|---|
| CFG-01 Crear un atributo base | hecha | `features/editor/StatsEditor.tsx` |
| CFG-02 Ver el listado de atributos | hecha | `features/editor/BlockSection.tsx` |
| CFG-03 Editar un atributo | hecha | `features/editor/StatEditRow.tsx` |
| CFG-04 Eliminar un atributo | hecha | `features/editor/StatDeleteRow.tsx` |
| CFG-05 Crear un juego desde cero | hecha | `features/editor/CreateOptimizerPage.tsx` |

CFG-06 (ver y validar la configuración) no pertenece a esta épica, pero se construyó aquí. Sin una
pantalla que muestre el estado de la plantilla no existía dónde integrar el editor.

## Lo construido

| Commit | Aporte |
|---|---|
| `17d444e` | CFG-05. Crear un juego vacío y válido, sin pedir cuenta |
| `c66b41c` | Eliminar rayas largas de textos y comentarios |
| `6cff5b7` | CFG-06. Primera pantalla que consume `validateTemplate` |
| `fc047d0` | Pasar el inventario al motor: nueve comprobaciones que no se ejecutaban |
| `013e8b3` | Cerrar cinco criterios de CFG-05 que faltaban |
| `998f123` | Cimientos: `statReferences` y el camino único de escritura |
| `cec1a57` | CFG-01, y el guardián de ids en el motor |
| `8cab9f1` | Eliminar la duplicación antes de que se triplicara |
| `03bbedb` | Lo que señalaría el análisis estático |
| `58c4980` | CFG-02. Búsqueda, orden y estado de uso |
| `2ed649f` | Esta bitácora y las entradas de changelog que faltaban |
| `40cbc0e` | CFG-03. Edición en la fila, con aviso al cambiar la acumulación |
| `bd4b437` | CFG-04. Borrado con cascada hasta punto fijo |
| `fa59fb9` | El modelo de propiedad, escrito para la épica 2 |
| `d820677` | Listar los borradores locales en la portada |
| `17405a8` | Borrarlos, con la cuenta de piezas que se eliminan |
| `ab5f987` | El menú de los tres puntos: renombrar, duplicar y borrar |
| `8eb7884` | Guardar el optimizador en la cuenta, privado o comunitario |
| `5f63bb9` | Cerrar el ciclo: la lista indica dónde reside cada borrador y permite quitarlo de la cuenta |
| `bcf96cd` | El botón de guardar, siempre visible, y la validación como condición |
| `b92a37a` | El botón pasa a flotante y las reglas se evalúan al hacer clic |

### Tres hallazgos no previstos

**Nueve comprobaciones escritas y nunca ejecutadas.** El motor tiene 54 comprobaciones, y nueve solo
se ejecutan si recibe el inventario (`E_RANURA_VACIA`, `E_REQUISITO`, `W_STAT_DESCONOCIDA` y seis
más). CFG-06 llamaba a `validateTemplate(template)` sin ese argumento. Por esta razón estaban
probadas en el motor, pero no se ejecutaban desde la aplicación. El espacio de búsqueda también se
calcula en ese bloque, y por eso aparecía siempre como `n/a`.

**Los ids de estadística no se validaban.** Un id termina siendo el nombre de una variable dentro de
las fórmulas, y el tokenizador solo entiende identificadores. `validateTemplate` revisaba duplicados
pero no la forma. Una plantilla con `ataque-critico` validaba sin advertencia y fallaba después en
otro punto, porque el tokenizador lo interpreta como una resta. La regla ya existía para los nodos
de habilidad en `skills.ts`, y las estadísticas habían quedado fuera. Ahora reside en
`libs/core-engine/src/lib/ids.ts` y la emite el validador, de modo que cubre también los paquetes
importados y las plantillas escritas a mano.

**La caché local era de solo escritura.** `useGame` guardaba en IndexedDB todo lo que cargaba, pero
nadie lo leía. Al habilitar la lectura, un juego creado desde el editor se abre sin publicarlo, y
uno visto antes se abre sin red.

## Decisiones

### El atributo no tiene mínimo ni máximo

`StatDefSchema` permanece como está. Un tope en el esquema sería una constante, y los topes reales
dependen del nivel. En WoW, el tope de Defensa equivale a `nivel * 5` y no a un número fijo. Eso ya
puede expresarse donde corresponde: en `leveling`, en un `derived` o en una fórmula con `min` o
`clamp`, que el motor ya soporta.

Como consecuencia, se descartan los campos de rango de CFG-01, la validación de mínimo mayor que
máximo, la columna de rango de CFG-02 y la advertencia por reducir el rango de CFG-03.

### La unidad es obligatoria

El esquema exige `flat` o `percent`, y el motor no calcula sin ella. La historia no la menciona. El
formulario la solicita igual, porque no existe alternativa.

### La acumulación se solicita al crear, aunque la historia no la pida

Determina si dos piezas con +30 suman 60 o suman 1,69. Equivocarse no produce un error: produce
números incorrectos en silencio. Obligar a crear primero y corregir después resulta peor que un
campo plegado con su valor habitual.

### El id tampoco se edita

Renombrar el valor visible no tiene costo, porque las fórmulas referencian por `id`. El criterio de
CFG-03 sobre no romper referencias se cumple, aunque por un motivo distinto del que la historia
supone. Cambiar el `id` sí rompería, y hacerlo correctamente exige reescribir las fórmulas. Eso
requiere el serializador de árbol a texto, que todavía no existe.

Donde el criterio pide avisar al reducir el rango, el riesgo equivalente en este modelo es cambiar
la forma en que acumula una estadística ya utilizada. Dos piezas con +30 pasan de sumar 60 a sumar
1,69, y eso altera todos los resultados sin producir ningún error. Ese es el aviso que se entrega,
con el número de sitios afectados, incluido el inventario, y con confirmación explícita.

### El id se genera y no se muestra en el formulario

Se deriva del nombre mediante `suggestStatId`, en camelCase y respetando la convención del guion
bajo final para las porcentuales (`hp` y `hp_`). Es la convención que utilizan las diez plantillas de
ejemplo. No se usa `slugify`, que es la función del id de un juego, porque separa con guiones y un
guion dentro de una fórmula representa una resta.

No se solicita porque hoy no existe ningún sitio en la aplicación donde escribir una fórmula. Se
muestra en el listado. Si el editor de fórmulas por bloques llega a existir, el autor seguirá sin
escribirlo.

### Un bloque solo se edita si lo guardado puede volver a leerse

`editable` es exacto y no una aproximación. Se guarda bajo `template.gameId`, y el origen local lee
por el id de la URL. Ambos deben coincidir, y el id no puede ser un uuid, porque entonces el origen
remoto resolvería primero y ocultaría la copia local. En otras palabras, un optimizador del catálogo
todavía no se edita, y eso depende de la épica 2.

### Registros en lugar de condiciones encadenadas

Existen tres registros, y cada uno tiene miembros reales:

- `features/game/sources.ts`: indica de dónde proviene una plantilla.
- `features/editor/blocks.ts`: define qué partes tiene y cómo listarlas. Es dato puro, sin React.
- `features/editor/block-editors.tsx`: indica cuál de esas partes ya se edita.

El motivo es el mismo en los tres. Las historias pendientes agregan una entrada cada una en lugar de
disputar el mismo bloque de condiciones.

### Dos guardados distintos

El sistema guarda en dos lugares, y confundirlos produce trabajo perdido. Por eso la pantalla lo
declara con palabras.

El **guardado del navegador** es automático. Cada edición escribe en IndexedDB, no solicita cuenta y
no sale de la máquina. Gracias a esto, cerrar la pestaña durante una edición no tiene costo.

El **guardado de la cuenta** depende de un botón. Sube la plantilla a Supabase bajo el `author_id`
de la sesión activa, y por eso exige sesión. La política RLS depende de `auth.uid()`, y sin ella el
insert no tiene dueño al que pertenecer. Sin sesión, el botón no intenta guardar y fallar: conduce a
iniciar sesión y regresa al punto de origen.

Lo que sube es la plantilla, es decir, las estadísticas, las fórmulas y las reglas. Los objetos del
jugador no viajan. No es una limitación, sino el reparto del sistema. La matemática la construye el
autor, y los datos de cada partida los aporta cada jugador mediante importación de JSON o escritura
manual. El tipo `OptimizerDraft` no tiene por dónde recibir el inventario, y esa es la garantía real
de que no se filtre por descuido. Una prueba lo comprueba con un `@ts-expect-error`.

El vínculo entre el borrador local y su fila remota se guarda en la fila local (`remoteId`). Sin él,
cada clic insertaría un optimizador nuevo, porque el id local es un slug y el remoto un uuid. Se
escribe después de que la nube confirma. En el orden contrario, un fallo de red dejaría un
`remoteId` inexistente, y el guardado siguiente intentaría actualizar una fila fantasma.

Quién lo ve lo decide el autor y no el sistema. Un optimizador a medio hacer en el catálogo resulta
tan negativo como uno terminado que nadie encuentra.

### Guardar deja rastro en dos sitios, y borrar debe considerarlo

El guardado en la cuenta abrió un fallo que no existía antes. Borrar un borrador limpiaba IndexedDB
y dejaba la fila de Supabase inalcanzable para siempre. El vínculo entre ambas copias (`remoteId`)
reside en la fila local, de modo que borrarla primero elimina el único enlace hacia la otra.

El orden de las operaciones constituye la corrección, y no es intercambiable: primero la nube y
después lo local. Si la nube falla, el borrador permanece con su vínculo intacto y puede
reintentarse. En el orden inverso, un fallo de red dejaría exactamente los residuos que se querían
evitar. Existe una prueba que fija ese orden simulando una caída de red.

De ahí surgen las otras dos piezas. La lista debe indicar dónde reside cada borrador, porque la nota
«solo en este navegador» dejó de ser cierta cuando apareció el botón de guardar. Además debe existir
una forma de quitarlo de la cuenta sin borrarlo, porque son dos guardados distintos y deshacer uno
no debe llevarse el otro.

`unlinkRemote` es un método propio del repositorio y no un `save` con el campo vacío, porque `save`
fusiona con `??`. Pasarle `remoteId: undefined` conserva el valor anterior. Eso es correcto al
guardar y exactamente lo contrario de lo que se requiere al desvincular.

### Un botón que desaparece no explica nada

El botón de guardar tuvo tres formas antes de quedar correcto, y las dos primeras fallaron por la
misma razón: no estaba donde se lo buscaba.

**Oculto.** Residía en la cabecera de la configuración, de modo que desaparecía con el desplazamiento
y no existía en las demás secciones.

**Apagado.** Desaparecía cuando no se podía guardar, lo que resulta peor que un botón inútil. Quien
lo busca y no lo encuentra concluye que el guardado no existe o que ya ocurrió.

**Flotante.** Permanece fijo abajo a la derecha, presente en todas las secciones de un optimizador
propio y siempre pulsable. Nunca se apaga.

Que no se apague cambia dónde residen las reglas: se evalúan al hacer clic y no en cada render. Eso
resulta más económico y más honesto, porque `validateTemplate` recorre la plantilla entera y no
tiene por qué ejecutarse mientras alguien escribe el nombre de una estadística. El orden de las
comprobaciones va de la más barata a la más cara y de la más accionable a la menos: sesión, bloques
vacíos y solo entonces el motor.

El diálogo es ahora la única pantalla que explica por qué no se puede guardar. Sin sesión ofrece
iniciarla o crear una cuenta, lo que obligó a corregir algo adicional. El registro ignoraba el
destino de vuelta y siempre dirigía al perfil, de modo que registrarse durante una edición alejaba
al usuario de su tarea.

Dos hallazgos surgieron de este trabajo, ambos anteriores a él:

- El componente de botón solo quitaba el puntero al deshabilitarse, sin aplicar ningún cambio
  visual. En toda la aplicación, un botón apagado parecía pulsable.
- El tema no define `--color-card`, y `bg-card` se usa en once lugares. Ninguno pinta nada. No se
  advierte porque detrás hay una página casi negra. Se advirtió en el diálogo, que es el primer
  sitio con contenido debajo. El diálogo usa `bg-surface`; los otros diez permanecen como estaban, a
  la espera de decidir si el token se agrega.

### El modelo de propiedad

El equipo lo decidió, y está implementado en la base de datos desde la migración inicial. La épica 2
no lo inventa: lo expone.

| Regla | Dónde reside hoy |
|---|---|
| Los borradores permanecen en este navegador | IndexedDB, mediante `games.repo` y `localSource` |
| Lo que sube a la base es la configuración del optimizador | `optimizers.template` |
| El autor decide si es comunitario | `optimizers.published`, en el `grant update` |
| Ese interruptor lo mueven el autor y los administradores | `optimizers_update`, con `is_admin()` |
| Nadie más puede borrarlo | `optimizers_delete` |
| Editar algo ajeno produce una copia | `forked_from`, en el `grant insert` |

Dos detalles ya estaban bien resueltos y conviene no romper. El `grant update` enumera columnas y
`author_id` no figura entre ellas, de modo que ni el autor puede transferir la autoría. Además,
`forked_from` tiene `on delete set null`, así que una copia persiste al borrado de su original y
solo pierde el puntero.

Lo pendiente pertenece a la aplicación. `apps/web` conoce el tipo `role: 'user' | 'admin'` y no lo
lee en ningún sitio, y nunca pregunta quién es el usuario para decidir si puede editar.

Eso define la forma final de `editable`, que hoy constituye una aproximación local:

1. Borrador local propio. Se edita en el sitio.
2. Remoto, y el usuario es el autor o un administrador. Se edita en el sitio, cuando exista el camino
   de escritura a Supabase.
3. Remoto, y el usuario no es ninguno de los dos. No se edita: se ofrece copiarlo. La copia nace
   como borrador local con `forkedFrom` apuntando al original, y puede publicarse como propia.

El tercer caso encaja con el resto del producto sin forzarlo. La copia llega al IndexedDB del usuario
como cualquier otro borrador.

## Divergencias con los criterios de aceptación

Lo siguiente no se implementó, por historia. Nada de esto constituye un olvido.

### CFG-01

| Criterio | Motivo |
|---|---|
| valor mínimo y valor máximo | no existen en el modelo, por la decisión anterior |
| «el valor mínimo no puede ser mayor al máximo» | depende del punto anterior |

### CFG-02

| Criterio | Motivo |
|---|---|
| rango numérico en el listado | no existe en el modelo |
| fecha de creación y de modificación | no existen por atributo; la tabla `optimizers` las tiene para el optimizador entero, y la plantilla es un solo blob JSON |
| ordenar por esas fechas | depende del punto anterior; en su lugar se ofrece volver al orden de la plantilla |
| refresco automático ante cambios en la base | corresponde al tiempo real de Supabase; para un juego local no hay base de datos que escuchar |

### CFG-03

| Criterio | Motivo |
|---|---|
| valor mínimo y valor máximo precargados | no existen en el modelo |
| advertencia por reducir el rango | depende del punto anterior; en su lugar se avisa al cambiar la acumulación, que es el riesgo equivalente |
| fecha de última modificación | no existe por atributo |

### CFG-04

| Criterio | Motivo |
|---|---|
| historial de deshacer hasta 10 acciones | es una funcionalidad propia, cercana a CFG-16; sin ella, la confirmación es la única red, y por eso lista exactamente qué desaparece en lugar de indicar un número |

El borrado en cascada sí se implementó como pide el criterio, con una salvedad que el criterio no
contempla: encadena. Si cae el derivado `dps` porque usaba `atk`, un objetivo con la fórmula
`dps * 2` queda apuntando a una variable inexistente. `cascadeOf` resuelve la cadena hasta punto fijo
antes de modificar nada, y existen pruebas con tres derivados seguidos.

El inventario no se modifica. Las piezas pertenecen al usuario y no a la plantilla, y el motor ya
ignora con un aviso las estadísticas que no conoce.

Donde el criterio no indicaba nada: si tras el borrado el optimizador deja de poder buscar, se avisa
antes. No se bloquea, porque la plantilla pertenece al autor, pero eliminar su único objetivo en
silencio permitiría que se rompa de forma inadvertida.

### CFG-05

Tres criterios quedaron fuera, y los tres dependen de sesión, es decir, de la épica 2. Corresponden
a asociar el optimizador al usuario autenticado, guardar el estado «Configuración incompleta» y
aparecer en la lista sin recargar, ya que hoy se navega al editor.

El tercero estaba mal clasificado y era un fallo real. Nada en la interfaz listaba los borradores
locales. Se creaba un optimizador, se ingresaba, y al volver al menú desaparecía de la vista. Seguía
en IndexedDB, y solo se llegaba escribiendo la URL de memoria. No dependía de sesión, porque
`games.list()` existía desde siempre. Está corregido.

Sobre el primero conviene ser preciso, porque se decidió dos veces. Se construyó local y sin cuenta
de forma deliberada, y el equipo confirmó después que los borradores locales permanecen. Lo que
exige sesión no es crear, sino publicar. El optimizador adquiere autor al subirse y no al nacer. Por
esta razón, ese criterio no está incumplido: está repartido entre las dos épicas.

### Pendientes de acordar con el equipo

- **El deshacer de diez pasos de CFG-04.** Es una funcionalidad propia, cercana a CFG-16. Mientras no
  exista, el borrado no puede revertirse y la confirmación es la única red.
- **CFG-03 y las referencias.** El criterio indica que al renombrar se actualicen las variables que
  usaban el nombre anterior. En este modelo las fórmulas referencian por `id` y no por nombre, de
  modo que renombrar no rompe nada y ese criterio ya se cumple. Lo que sí rompería es cambiar el
  `id`, y ninguna de las cuatro historias lo cubre.

## Lo que queda

La épica 3 queda cerrada: CFG-01 a CFG-05 están hechas. Sin embargo, un juego creado aquí todavía
no puede buscar. `missingRequired` exige cuatro bloques y solo uno se volvió editable. Faltan
ranuras, objetivos y personajes, que no estaban en estas historias.

Lo siguiente corresponde a la épica 2, el hub.

**Pendiente de aplicar.** La migración `20261123000001_nombre_de_cien.sql` sube el nombre del
optimizador de 80 a 100 caracteres en la base. Hasta que se ejecute contra la base hospedada, un
nombre de más de 80 se guarda en el navegador y falla al subirlo a la cuenta. El error de Postgres
aparece debajo del botón.

Fuera de la épica, anotado para cuando corresponda: mover `app/OptimizerPage.tsx` a
`features/optimizer/`, porque importa doce elementos de `features/` y ninguno de `app/`. También
queda el editor de fórmulas por bloques, cuyo modelo de datos ya existe (`FormulaNode` en
`formula.ts`) y cuya parte delicada consiste en serializar el árbol a texto con los paréntesis
correctos.

## Verificación

Cada commit supera la misma puerta antes de entregarse: `test`, `lint`, `typecheck` y `build` en los
siete proyectos, además de `check:genres`.

| Métrica | Valor |
|---|---|
| Pruebas en `apps/web` | 386 |
| Pruebas en `libs/core-engine` | 189 |
| Cobertura sobre código nuevo | 94,5 % |

La cobertura se mide como la mide la puerta de calidad: solo sobre las líneas añadidas.

### Una prueba intermitente conocida

`apps/web/src/app/OptimizerPage.spec.tsx` falla de forma esporádica cuando la suite se ejecuta bajo
carga. La frecuencia observada es de 2 de cada 10 corridas completas, y afecta a tres pruebas
distintas del mismo archivo. Una de ellas falló a 5246 ms contra el límite de 5000 ms que fija el
propio archivo. El arreglo previo elevó el techo, y la lentitud de fondo lo sigue superando. Esas
pruebas ejecutan búsquedas reales del motor. Sustituirlas por un doble, como se hizo en
`ConfigurationPage.spec.tsx`, las volvería deterministas.
