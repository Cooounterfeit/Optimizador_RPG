# Zenith Optimizer — Demo del Core Engine

Demo funcional del **motor de optimización combinatoria** de Zenith Optimizer.

Sigue la prioridad acordada: primero el cerebro (que un input entre y salga una
combinación óptima correcta), después una interfaz mínima para poder probarlo.

---

## Las cuatro vistas

| Vista | Qué hay |
|---|---|
| **Juegos** | Selector de juego. Cada tarjeta muestra ranuras, conjuntos y objetivos de su plantilla |
| **Optimizador** | El motor: configuración, restricciones, métricas de poda y las mejores builds |
| **Inventario** | Tus objetos, con sus íconos — y **la carga de tu propio inventario** |
| **Mis juegos** | CRUD completo de tus juegos: crear, editar con formularios, duplicar, exportar, borrar |
| **Validador** | Revisa una plantilla antes de publicarla: fórmulas, ciclos, monotonía, autopruebas |
| **Comparativa** | Zenith frente a Genshin Optimizer, punto por punto |

---

## El sistema arranca vacío

**No hay ningún juego incorporado.** Un optimizador que ya viene con Genshin
dentro parece una herramienta de Genshin; uno que arranca en blanco deja claro
que **el producto es el motor** y que los juegos son contenido: se escriben, se
importan, se editan y se comparten.

Los tres juegos que antes venían compilados ahora viven en `public/examples/`
como **paquetes normales**, del mismo formato exacto que exporta cualquier
usuario. Se importan desde la vista *Juegos* si alguien los quiere, y una vez
importados son juegos tuyos como cualquier otro: editables, bifurcables y
borrables. Si no los quieres ni como ejemplo, basta con borrar esa carpeta.

---

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente `http://localhost:5173`).

El inventario de ejemplo se carga solo. También puedes arrastrar cualquier
export **GOOD** de Genshin Optimizer sobre la caja de la izquierda.

Cuatro comprobaciones sin interfaz:

```bash
npm run bench          # correctitud contra fuerza bruta + rendimiento
npm run ejes           # requisitos, presupuestos, exclusión mutua y agregación multiplicativa
npm run expresividad   # ¿qué mecánicas de WoW, PoE, ZZZ y Endfield se pueden escribir?
npm run agregacion     # cómo se comportaba el acumulador antes del modo multiplicativo
npm run validar        # valida las plantillas incluidas y dos rotas a propósito
```

---

## Las 4 historias de usuario

| HU | Qué pide | Dónde se ve |
|----|----------|-------------|
| **HU01** | Maximizar una estadística lineal fija | Objetivos *Vida máxima*, *Defensa máxima*, *Ataque máximo* |
| **HU02** | Detectar sinergias de conjunto | Chips verdes bajo cada build: el motor descubre solo los 2pz/4pz |
| **HU03** | Optimizar fórmulas **no lineales** | Objetivos *DPS* y *DPS con reacción* (Prob.Crítico × Daño Crítico) |
| **HU04** | Poda por restricciones | Panel *Restricciones*: exige un mínimo y mira cómo baja el tiempo |

Detalle de HU04 que conviene mostrar en la presentación: **añadir una
restricción hace que el motor termine más rápido**, no más lento. En el
inventario real, exigir `Prob. Crítico ≥ 75%` reduce el tiempo de ~7,1 s a ~1,5 s,
porque ramas enteras se descartan antes de calcularlas.

---

## Por qué esto no es fuerza bruta

Con el inventario real de ejemplo (2.285 artefactos) el espacio de búsqueda ronda
las **10^13 combinaciones**. A 10 millones por segundo, recorrerlas todas
tardaría décadas.

El motor trabaja en cuatro capas:

**0. Detección numérica de relevancia.** Antes de nada, perturba cada estadística
y observa si el objetivo cambia. Para un DPS de personaje Geo descarta solo los
bonos Pyro, Hydro, Cryo, la curación y la defensa. El problema pasa de ~20
dimensiones a 5. *No hay una sola línea de código específica de ningún juego:
sale de evaluar la fórmula de la plantilla.* Además fusiona ejes que entran de
forma idéntica en el objetivo.

**1. Filtro de dominancia.** Dentro de una misma ranura y un mismo conjunto, si
un ítem es peor o igual que otro en todas las estadísticas que importan, no puede
estar en la solución óptima y se elimina.

**2. Branch and bound con cota superior.** En cada nodo se construye un vector
"utópico": lo acumulado + el máximo que aún se puede conseguir + el mejor bono de
conjunto todavía formable. Si evaluar el objetivo sobre ese vector imposible ya
da menos que la mejor build encontrada, el subárbol entero se descarta.

**3. Poda por restricciones.** Igual, con los mínimos exigidos.

Hay además un **arranque en caliente** (greedy + ascenso de colina) que consigue
una build muy buena antes de empezar el árbol, para que la cota sea exigente
desde el primer nodo.

### La poda es exacta, no heurística

El motor exige `monotonic: true` en el objetivo: que sea no-decreciente respecto
de cada estadística. Si lo es, el vector utópico acota por arriba cualquier hoja
del subárbol, y podar **no puede perder el óptimo**.

Por eso la interfaz distingue dos estados:

- **«Óptimo global demostrado»** — la búsqueda terminó. Es *el* mejor, no una aproximación.
- **«Se agotó el tiempo»** — devuelve la mejor encontrada y lo dice claramente.

`npm run bench` verifica esto comparando contra fuerza bruta exhaustiva sobre
subconjuntos pequeños: los resultados coinciden exactamente.

---

## El contrato: la plantilla de juego

`src/core/types.ts` define el esquema v0.1. **Es el contrato del sistema**: el
motor, la interfaz y los parsers dependen solo de él, nunca de un juego concreto.

Hay dos plantillas incluidas:

- `src/games/genshin.template.json` — 5 ranuras, 44 conjuntos, fórmula de daño real
- `src/games/terraria.template.json` — 7 ranuras, conjuntos de 3 piezas, tres clases de daño

Cambiar de juego con el selector de arriba **no ejecuta ni una línea de código
distinta**. Esa es la tesis del proyecto, y aquí está demostrada.

Las fórmulas se interpretan con un parser propio (`src/core/formula.ts`), **sin
`eval()` ni `new Function()`**: las plantillas vienen de la comunidad y
ejecutarlas como código sería una vulnerabilidad de ejecución remota.

---

## Estructura

```
src/
  core/
    types.ts       ← el contrato: esquema de plantilla v0.1
    formula.ts     ← intérprete de fórmulas (RF.2), sin eval
    optimizer.ts   ← branch and bound (el Core Engine)
  worker/
    optimizer.worker.ts   ← el motor en un hilo aparte (RNF.1)
  adapters/
    goodImport.ts     ← importa el formato GOOD
    genshinAssets.ts  ← íconos. Con goodImport, los dos únicos archivos
                        que saben algo de un juego concreto
  games/
    *.template.json
  views/            ← Juegos · Optimizador · Inventario · Comparativa
  ui/               ← componentes compartidos y hook del worker
scripts/
  bench.ts          ← verificación contra fuerza bruta + medición
```

---

## Decisiones y limitaciones conscientes

**Sin scroll horizontal.** La regla `min-width: 0` global en `styles.css` es lo
que lo garantiza: sin ella, un hijo ancho (una fórmula larga, una tabla) estira
su columna de grid y arrastra scroll a toda la página. Verificado a 1440, 1100,
820 y 390 px.

**Sin Tailwind ni shadcn.** Un solo CSS plano. La prioridad era el motor, y
menos dependencias significa menos riesgo de que `npm install` falle el día de la
demo. Migrar después es trivial.

**Sin React Flow.** Aquí no hay árboles de habilidades: esto es optimización de
equipamiento. React Flow entra cuando toque el *Graph Manager*.

**Íconos oficiales, servidos por terceros.** Los íconos de artefactos, armas y
personajes vienen de [Project Amber](https://gi.yatta.moe), un proyecto
comunitario, y pertenecen a HoYoverse. El mapeo `clave GOOD → ícono` se generó
una sola vez y vive en `genshin.assets.json`: en tiempo de ejecución no se llama
a ninguna API. Si una imagen no carga, cada ícono cae a un respaldo tipográfico
con el color de rareza, así que la demo nunca se rompe por eso.

Para una demo esto está bien. Para un producto monetizado, depender de una CDN
comunitaria para servir arte con copyright sigue siendo el riesgo que ya está
señalado en el análisis — solo que ahora es de otro.

**Datos de Genshin simplificados.** Las estadísticas base de personaje son
aproximaciones a nivel 90 con arma incluida. Los bonos de 4 piezas que en el
juego real son condicionales se aproximan a un valor plano equivalente. Está
documentado dentro de la propia plantilla, en *Notas de la plantilla*.

**Sin restricción de unicidad entre ranuras.** Si dos ranuras comparten el mismo
pool de ítems, el motor podría elegir el mismo objeto dos veces. Por eso las
ranuras de accesorio de Terraria están categorizadas. Es la limitación más real
de v0.1 y toca resolverla antes de soportar juegos con accesorios libres.

**El objetivo más duro no siempre converge.** *DPS con reacción amplificadora*
añade una dimensión más y una segunda curva no lineal; sobre el inventario
completo puede agotar los 30 s. La interfaz lo dice en vez de fingir que
terminó. Subir el nivel mínimo o añadir una restricción lo resuelve.

---

## Números de referencia

Medidos sobre el inventario real de ejemplo, artefactos de nivel ≥ 16:

585 artefactos, personaje Navia, todos con **óptimo global demostrado**:

| Objetivo | Espacio de búsqueda | Evaluadas | Podado | Tiempo |
|---|---|---|---|---|
| Vida máxima (lineal) | 77.903.280 | 522 | 99,9993 % | 0,03 s |
| DPS (no lineal) | 4.266.292.800 | 289.157 | 99,9932 % | 7,10 s |
| DPS con `crít ≥ 75%` | 4.266.292.800 | 179.450 | 99,9958 % | **1,52 s** |

La última fila es HU04 en una línea: la restricción no encarece la búsqueda, la
abarata casi 5 veces.

Sobre el inventario completo (2.285 artefactos, sin filtro de nivel) el DPS sigue
demostrando el óptimo en ~13 s.


---

## Sobre la comparativa

La vista *Comparativa* no es marketing: es el resultado de investigar qué hace
hoy Genshin Optimizer. Dos hallazgos que conviene conocer antes de presentar:

1. **Ya es multijuego.** Tiene tres frontends (Genshin, Zenless Zone Zero en
   alfa, Star Rail en desarrollo) sobre un monorepo NX, y un motor de cálculo
   propio, *Pando*, diseñado para ser agnóstico al juego. El argumento «somos
   multijuego y ellos no» no se sostiene.

2. **El stack coincide una a una** con el del documento «Definición de
   tecnologías» de Zenith: NX 20.5.0, Vite 6.0.0, TypeScript 5.7.3, React
   18.3.1, i18next 23.6.0, tesseract.js 5.0.2.

Ninguna de las dos cosas hunde el proyecto — pero es mucho mejor decirlas
ustedes que dejar que las note un evaluador. El diferenciador real de Zenith no
es el número de juegos ni el stack: es **quién puede añadir un juego**. En
Genshin Optimizer es un proyecto de ingeniería; en Zenith debería ser escribir
un archivo de datos.


---

## Qué aguanta el lenguaje de plantillas

`npm run expresividad` somete el formato a 13 mecánicas reales de cuatro juegos.
Resultado: **11 listas, 2 problemáticas, 0 imposibles de escribir.**

Cosas que ya funcionan y que no eran obvias:

- Los **rendimientos decrecientes de WoW** se arman encadenando `min` y `max`, sin `if`.
- Los **umbrales de celeridad** salen con `floor`, que es no-decreciente, así que la poda sigue siendo exacta.
- Los **condicionales de PoE** («mientras estés a vida completa») se resuelven con una bandera 0/1 en el perfil base — el mismo mecanismo que elige el bono de cáliz correcto según el elemento del personaje.
- La **conversión de daño físico a fuego**, con doble aplicación de modificadores, se escribe entera.

Las dos que fallan no fallan por sintaxis sino por **monotonía**: «recarga exacta
200%, pasarse es desperdicio» hace que la función suba y luego baje, y ahí la cota
superior deja de ser válida.

### Los tres huecos — dos ya cerrados

**Cerrado: modos de agregación.** Cada estadística declara si acumula sumando o
multiplicando. Los modificadores «more» de Path of Exile ya se calculan bien:
dos fuentes de +30% dan ×1,69, no ×1,60.

**Cerrado: no-monotonía.** No con aritmética de intervalos sino con algo más
directo y honesto — el motor **cambia de modo**. Si el objetivo es monótono, poda
por cota y demuestra el óptimo. Si no lo es, desactiva esa poda, busca con
reinicios y ascenso de colina, y lo dice: *«el resultado es bueno, pero no está
demostrado que sea el óptimo»*. Objetivos como «recarga exacta 200%» o «resistir
mucho sin ir cargado» pasan de imposibles a usables.

**Abierto: la forma del problema.** Sigue siendo una pieza por ranura.

### Los tres huecos originales

**1. Modos de agregación.** `npm run agregacion` lo demuestra: dos objetos con
«+30% more damage» cada uno dan **160** en el motor (suma 30+30) cuando lo
correcto en PoE es **169** (1,30 × 1,30). Un 5,3% de error. La fórmula estaba bien
escrita — el problema es que el acumulador suma todas las estadísticas. Hace falta
declarar por estadística si acumula sumando o multiplicando. Es el arreglo más
barato y el que desbloquea PoE.

**2. No-monotonía.** Necesita aritmética de intervalos: evaluar el objetivo sobre
rangos `[mín, máx]` en vez de un punto utópico. Así la cota sale de la estructura
de la fórmula y deja de hacer falta `monotonic: true`.

**3. La forma del problema.** El motor asume **una pieza por ranura**. El árbol de
pasivas de PoE es un subgrafo conexo bajo presupuesto; los talentos de WoW son un
subconjunto bajo presupuesto. Son problemas combinatorios distintos y ninguna
expresividad en el lenguaje los resuelve. Ahí es donde entra el *Graph Manager*.

### Estado por juego

| Juego | Estado |
|---|---|
| **ZZZ**, **Arknights: Endfield** | Funcionan hoy. Solo hay que escribir la plantilla |
| **WoW** | Funciona hoy por pesos de estadística, con DR y umbrales. El óptimo «de verdad» requiere simulación temporal — frontera documentada, no fallo |
| **PoE** | Los objetos sí, en cuanto se arregle la agregación. El árbol de pasivas no |

---

## Plantillas de la comunidad

En cuanto las plantillas las escriba gente desconocida, el motor pasa a ser un
**intérprete de contenido ajeno**. Eso impone requisitos que una demo normal no
tiene, y `src/core/validate.ts` los cubre.

**Un bug encontrado y corregido en el camino.** Un derivado que referenciaba a
otro declarado más abajo no fallaba: leía el valor de la **evaluación anterior** y
devolvía un número incorrecto en silencio. Con plantillas propias eso no pasa
nunca; con plantillas ajenas es cuestión de tiempo. Ahora los derivados se ordenan
topológicamente y los ciclos se rechazan con un mensaje claro.

**Autopruebas dentro de la plantilla.** El campo `selfTests` permite que el autor
declare «con estas piezas y este perfil, el resultado debe ser este», y la
plataforma lo verifica sola:

```json
"selfTests": [{
  "name": "El bono de 4 piezas de Cazador Marechaussee se aplica",
  "profileId": "navia", "objectiveId": "dps",
  "items": [ ... una pieza por ranura ... ],
  "expectStats": { "critRate_": 41.0 }, "tolerance": 0.01
}]
```

Es la respuesta al problema que hundiría un catálogo comunitario: **una plantilla
equivocada no falla, devuelve builds equivocadas con total confianza.** La votación
de la comunidad llega tarde; una prueba automática llega antes de publicar.

**Lo que más aporta el validador** es comprobar la **monotonía numéricamente**. Es
la propiedad de la que depende que la poda sea exacta, y ningún autor de plantillas
debería tener que entenderla: el validador la mide y avisa.


---

## Los cuatro ejes del motor

«Cualquier juego» se puede volver auditable. Son cuatro ejes:

| Eje | Qué es | Estado |
|---|---|---|
| **1. Expresividad** | cómo se calculan los valores | fórmulas de la plantilla, sin `eval`, con acumulación por suma **o por producto** |
| **2. Forma del problema** | qué se está eligiendo | una pieza por ranura |
| **3. Restricciones** | qué es legal equipar | mínimos, **máximos/presupuestos**, **requisitos por pieza**, **exclusión mutua** |
| **4. Objetivos** | qué se optimiza | maximizar uno, en modo **exacto** o **heurístico** |

Lo que no era obvio: **el eje 3 desbloquea más juegos por unidad de esfuerzo que
el eje 2.** Lo que le faltaba al motor para cubrir géneros enteros —souls-likes,
Monster Hunter, cualquier RPG con requisitos de equipo— no eran algoritmos
nuevos: eran requisitos y presupuestos. Y como toda restricción, **aceleran** la
búsqueda en vez de encarecerla.

### La plantilla «Souls (simplificado)»

Existe para ejercitar exactamente eso. `npm run ejes` lo demuestra:

```
1. REQUISITOS DE ATRIBUTO
   Guerrero — Fuerza 50     descarta 7 piezas  →  empuña Gran Hacha de Guerra
   Mago — Inteligencia 60   descarta 7 piezas  →  empuña Vara de Luna Oscura

2. PRESUPUESTO DE CARGA (un máximo: menos es mejor)
   carga <= 58   peso usado 57.9   supervivencia 9.938
   carga <= 18   peso usado 18.0   supervivencia 6.480

3. EXCLUSIÓN MUTUA (3 ranuras de talismán, mismo inventario)
   Amuleto Rúnico · Talismán de Acero · Escama de Dragón — los tres distintos

4. AGREGACIÓN MULTIPLICATIVA
   si se sumaran sería x1.3400  |  multiplicando da x1.3793

5. CORRECTITUD — el óptimo coincide con fuerza bruta en los tres objetivos

6. OBJETIVO NO MONÓTONO
   tanque      modo exacto       peso 58.0
   tanqueAgil  modo heurístico   peso 15.1   ← penaliza ir cargado, y se nota
```

Un detalle que vale la pena: **un máximo invierte la dominancia**. Para una
estadística normal, más es mejor y una pieza peor en todo se descarta. Para un
coste (peso, carga, capacidad) es al revés, y el filtro lo tiene en cuenta.

### La arquitectura que hace verdad «cualquier juego»

No es un algoritmo universal — no existe. Elegir uno por ranura, elegir un
subconjunto bajo presupuesto y elegir un subgrafo conexo son problemas
combinatorios distintos, y forzarlos en un solo solver da algo que resuelve los
tres mal.

Lo que sí se comparte, y es donde está el valor:

- un solo **lenguaje de fórmulas**
- un solo **sistema de restricciones**
- un solo **esquema de plantilla**
- un solo **validador**
- una sola **garantía**: cuando el modo es exacto, el óptimo está demostrado

La plantilla declara su forma y el motor despacha al solver correspondiente. El
*Graph Manager* no es un módulo de interfaz: es el tercer solver.


---

## Cómo añade un juego el usuario

Hasta ahora la respuesta honesta era «no puede»: había que escribir el JSON a
mano y recompilar. La vista **Añadir juego** cierra eso, y tiene **dos caminos**
que producen exactamente lo mismo, así que se puede empezar en uno y terminar en
el otro.

### Camino A — de cero, solo con formularios

Para quien no tiene los datos en ninguna tabla y quiere construirlo todo a mano.
**Empezar de cero** crea un juego completamente vacío —sin estadísticas, sin
ranuras, sin objetos— y abre el editor con una **lista de pasos pendientes**:

```
· Define al menos una estadistica (ataque, vida, defensa…)        [ir]
· Define al menos una ranura de equipo (arma, casco…)             [ir]
· Ajusta los valores del personaje sin equipo                     [ir]
· Define que se quiere maximizar                                  [ir]
· Anade objetos: cada ranura necesita al menos uno                [ir]
```

La lista de errores del validador dice qué está mal; esto dice **qué hacer a
continuación**, un paso a la vez, y desaparece cuando el juego está completo.

Probado: dos estadísticas, dos ranuras, un objetivo y dos objetos creados
íntegramente con formularios — guardado y optimizando. Sin pegar nada y sin
tocar JSON.

### Camino B — el asistente, desde una tabla

Pensado para quien no maneja JSON, que es casi todo el mundo. La idea es
invertir el flujo: **los datos generan la plantilla, no al revés.**

1. **Nombre del juego.**
2. **Pegas tu tabla de objetos.** De ahí se deduce todo: cada columna numérica
   pasa a ser una estadística (con su unidad, detectando los `%`), los valores
   distintos de la columna de tipo pasan a ser las ranuras y los de la columna
   de familia, los conjuntos. El usuario no declara nada: revisa y corrige.
3. **Eliges qué maximizar de un catálogo de recetas** — maximizar una
   estadística, suma con pesos, daño con crítico, supervivencia, producto de
   multiplicadores — y rellenas sus huecos con menús desplegables. **La fórmula
   se escribe sola.**
4. **Los valores del personaje sin equipo**, en un formulario.
5. **Crear.** Validado y guardado.

El autocompletado de las recetas fue más delicado de lo que parece: «Prob.
Crítico» y «Daño Crítico» son las dos porcentajes y las dos hablan de críticos,
así que elegir por unidad no basta. Cada hueco declara palabras que suman y
palabras que restan, y **los huecos opcionales se dejan vacíos si no hay una
coincidencia clara** — es preferible eso a meter algo equivocado.

Probado: se pega una tabla con Arma/Armadura/Casco y columnas Ataque, Defensa,
Prob. Crítico y Daño Crítico. Deduce 4 estadísticas, 3 ranuras y 3 conjuntos;
asigna los huecos correctamente y deja vacíos los dos que no aplican; genera

```
objetivo    = ataqueTotal * multCritico
ataqueTotal = base_ataque + ataque
critEfectivo= min(base_prob_critico + prob_critico, 100)
danoCritico = base_dano_critico + dano_critico
multCritico = 1 + (critEfectivo/100) * (danoCritico/100)
```

y optimiza con **óptimo global demostrado**. Sin escribir una sola llave.

### Camino C — modo avanzado

El flujo completo con el JSON en crudo, para quien quiera control total:

**1 · De dónde partes.** Nadie escribe una plantilla desde cero, así que la
opción principal es **bifurcar** una que ya funciona — el mismo mecanismo de
*fork* del catálogo comunitario, usado como herramienta de autoría. También hay
un esqueleto mínimo y la opción de abrir un `.json`.

**2 · La plantilla.** Un editor de JSON con el **validador corriendo mientras
escribes**: errores de fórmula, ciclos entre derivados, variables inexistentes,
conjuntos imposibles y —lo más valioso— la comprobación numérica de monotonía.
Nadie debería tener que entender esa propiedad para escribir una plantilla; el
validador la mide y avisa.

**3 · Los objetos.** Se pega una tabla copiada de una wiki o de una planilla.
El importador detecta el separador (tabulación, coma, punto y coma, barra) y
**propone a qué corresponde cada columna** comparando las cabeceras con las
estadísticas de tu plantilla, sin acentos ni mayúsculas de por medio. Acepta
`12`, `12%`, `+12` y `1.234,5`. Tú corriges lo que se haya equivocado y
confirmas.

**4 · Guardar.** Queda en el navegador y aparece en *Juegos* junto a las
plantillas incluidas, marcado como *tuyo*. Para el motor no hay ninguna
diferencia entre un juego incluido y uno que escribiste tú.

Hay además **exportar**, que descarga `{ template, items }` en un solo archivo.
Eso es exactamente lo que se subiría a un catálogo comunitario: el objeto que se
guarda y el que se comparte son el mismo.

### Probado de punta a punta

Crear un juego desde el esqueleto, pegar esta tabla:

```
Nombre            Ranura     Ataque  Defensa  Prob. Critico
Espada de hierro  Arma       45      0        3
Hacha pesada      Arma       78      0        1
Túnica arcana     Armadura   8       14       11
```

El mapeo sale correcto solo (incluida *Prob. Crítico* → `critico`), se importan
los objetos, se guarda, aparece en *Juegos*, **optimiza con óptimo global
demostrado** y sobrevive a recargar la página.


---

## CRUD completo de tus juegos

La vista **Mis juegos** es la administración entera, sin JSON en ningún paso
obligatorio.

**Lista.** Cada juego con sus cifras (objetos, ranuras, estadísticas, objetivos,
última edición) y cinco acciones: **usar · editar · duplicar · exportar ·
borrar** (con confirmación).

**Editor con formularios**, en siete pestañas:

| Pestaña | Qué edita |
|---|---|
| **General** | nombre, descripción y notas |
| **Estadísticas** | añadir, renombrar, unidad, **modo de acumulación** (suma o producto), cuáles son ajustables desde el optimizador y los **presupuestos** |
| **Ranuras** | añadir y renombrar, con el recuento de objetos de cada una |
| **Conjuntos** | escalones (N piezas) y sus efectos, editables uno a uno |
| **Perfiles** | varios perfiles base con todos sus valores |
| **Fórmulas** | valores intermedios y objetivos, con el selector exacto/heurístico |
| **Objetos** | CRUD por objeto: buscar, filtrar, editar cada estadística, requisitos, grupo exclusivo, borrar, crear, borrado masivo del filtro e importar más desde otra tabla |

**Dos detalles de diseño que importan:**

Una estadística **en uso no se puede borrar**. El editor rastrea dónde aparece
cada una —fórmulas, conjuntos, objetos— y en vez del botón de borrar muestra
«en uso (N)». Así no se rompe una plantilla sin darse cuenta.

**El validador corre mientras editas**, no al guardar. Los errores aparecen abajo
en todo momento y el botón de guardar queda bloqueado mientras haya alguno. Si
cambias una fórmula y deja de ser monótona, te enteras en ese momento, no cuando
los resultados salgan raros.

### Probado de punta a punta

Crear con el asistente → editar (renombrar, añadir una estadística, añadir un
perfil, borrar un objeto, crear otro con 999 de ataque) → guardar → **el nuevo
objeto gana la optimización** → duplicar → borrar. Sin errores de consola y sin
scroll horizontal.


---

## Reconocimiento del archivo que sueltas

Un usuario va a soltar cualquier cosa en el botón de abrir. Antes, todo lo que
no fuera una plantilla exacta terminaba en el mismo muro de *«falta el campo
obligatorio gameId»* repetido seis veces, que no le dice a nadie qué hizo mal.

`src/store/detectFile.ts` reconoce cuatro formas y responde lo único útil: qué
trajo y qué se puede hacer con ello.

| Lo que sueltas | Qué hace |
|---|---|
| **Paquete de Zenith** (`{template, items}`) | Carga plantilla y objetos, listo para guardar |
| **Plantilla suelta** | La carga y te pide que pegues los objetos |
| **Lista de objetos** | Los añade a la plantilla actual, o avisa que falta una |
| **Export GOOD de Genshin** | Lo reconoce como **inventario, no juego**, y lo carga en el Genshin incluido |
| **Cualquier otra cosa** | Dice qué claves trae y por qué no sirve |

**Y de paso arregló un bug serio: el propio formato de exportación no se podía
volver a importar.** «Exportar» producía `{template, items}` y «abrir archivo»
esperaba una plantilla suelta, así que el paquete fallaba la validación. Como el
intercambio de paquetes es la base de un catálogo comunitario, ese ciclo tenía
que cerrar. Ahora el export lleva su propia marca (`zenith: "0.1"`) y el
recorrido **exportar → borrar → reimportar** está probado de punta a punta.


---

## Cargar tus propios objetos

Es el flujo más frecuente de todos: mucha más gente va a meter **sus** piezas en
un juego que ya existe que a crear un juego nuevo. Por eso vive donde se lo
espera —la vista **Inventario → «+ cargar mis objetos»**— y no enterrado dentro
del editor.

Acepta las tres vías reales por las que llegan los datos:

- **Export GOOD** de Genshin Optimizer, Amenoma Kageuchi y compañía, con filtros
  de nivel y rareza que recalculan la vista previa en vivo.
- **Paquete `.zenith.json`** exportado desde aquí: toma sus objetos y descarta su
  plantilla, porque los objetos van al juego que tengas abierto.
- **Tabla pegada** desde una wiki o una planilla, con el mapeador de columnas.

**Y siempre dice si encajan antes de dejarte confirmar.** Cuenta cuántas
estadísticas reconoció, cuáles va a ignorar y cuántos objetos caen en ranuras
que no existen. Si nada encaja, el botón queda bloqueado con el motivo:

> *«Ninguna estadística de estos objetos existe en Terraria (simplificado). O el
> inventario es de otro juego, o hay que añadir esas estadísticas a la
> plantilla.»*

Elegís entre **añadir** a lo que ya tienes o **reemplazar** todo el inventario, y
el resultado se guarda en el navegador.

### Probado

Importar el ejemplo de Genshin → Inventario → soltar un export GOOD real de
2.285 artefactos → reconoce 19 estadísticas → filtrar a nivel ≥ 20 deja 577 →
reemplazar → **optimiza con óptimo global demostrado sobre tus propios
artefactos** → sobrevive a recargar la página. Y el mismo archivo soltado en
Terraria se rechaza con las dos razones concretas.

---

## Genshin: solo imágenes y personajes, los objetos los pones tú

El ejemplo de Genshin ya **no trae ni un solo artefacto ni un arma**. Lo que trae
es lo que no puedes sacar de tu cuenta: los **119 personajes** con sus
estadísticas base reales, los 44 conjuntos con sus bonos de 2 y 4 piezas, y las
**imágenes** de personajes, armas y artefactos. Todo lo demás sale de tu JSON.

### Los personajes están calculados, no copiados

Vida, ATQ y DEF a nivel 90 se computan desde las **curvas de crecimiento reales**
del juego más los saltos de ascensión, igual que hace el juego internamente. La
estadística de ascensión (Prob. CRÍT, Daño CRÍT, Maestría, % del elemento…) se
aplica según el personaje. Nada de tablas copiadas a mano que envejecen mal.

### El arma es una ranura más

Genshin pasó de 5 a **6 ranuras**: `weapon`, `flower`, `plume`, `sands`,
`goblet`, `circlet`. El arma no es un caso especial en el motor — es un objeto
normal en su ranura, y por eso el mismo *branch and bound* la optimiza junto con
los artefactos sin una sola línea de código específica de armas.

Su ATQ base y su subestadística también salen de las curvas, respetando nivel y
ascensión de tu export.

### Un mandoble no equipa un arco

Cada personaje declara su tipo de arma como un atributo (`wt_sword`, `wt_bow`,
`wt_claymore`, `wt_polearm`, `wt_catalyst`) y cada arma pide ese atributo con
`requires`. El filtro es **del motor**, no de la interfaz: las armas
incompatibles se descartan antes de entrar al árbol de búsqueda.

Esto se prueba en el `selfTest` nº 4, que le da al personaje **un arco de 9999
ATQ y un mandoble de 600** y exige que gane el mandoble. Si la restricción no
funcionara, el test fallaría con la build "mejor" pero imposible.

### El flujo completo

*Juegos → importar el ejemplo de Genshin* (0 objetos, 119 personajes) →
*Inventario → + cargar mis objetos* → suelta tu GOOD → **«2.285 artefactos ·
337 armas»** → filtra a nivel ≥ 16 → **«586 artefactos · 337 armas»** → cargar →
923 objetos tuyos → optimizar.

### Probado de punta a punta

Ayaka con ese inventario: gana **Mistsplitter Reforged** —su arma insignia— con
4 piezas de Cazador Marechaussee y cáliz de cryo. Puntuación 11.635 sobre un
espacio de **17.280 millones de combinaciones**, 99,9973 % podado, **óptimo
global demostrado**. Sin errores de consola y sin scroll horizontal a 1400, 900
y 400 px.

---

## El catálogo: un motor, muchas caras

La vista *Juegos* dejó de ser una lista y pasó a ser un **catálogo**: buscador,
categorías a la izquierda y una rejilla de carátulas. La forma no es decoración
— comunica la tesis. Un optimizador es una página; un catálogo de optimizadores
hechos por la comunidad es una plataforma, y eso es lo que el motor permite ser.

### Las imágenes las pone el usuario

**No distribuimos arte de juegos que no es nuestro.** No hay una fuente legítima
para las carátulas de trescientos títulos, y fingir que la hay es un problema
esperando a ocurrir en un proyecto que quiere monetizarse. Lo que sí damos es el
hueco y las tres vías para llenarlo:

- **arrastrar una imagen** desde el disco,
- **pegar la dirección** de una que ya esté en la web,
- o **ninguna**: un degradado con las iniciales, con color elegible, para que una
  tarjeta sin carátula siga siendo reconocible de un vistazo.

### Por qué la imagen no se guarda tal cual

Una captura de escritorio pesa fácilmente 4 MB. `localStorage` da unos 5. Guardar
el archivo sin tocarlo significaría que **el usuario pierde sus juegos por haber
elegido una foto bonita**, y encima sin entender por qué.

Así que antes de tocar el almacenamiento la imagen se redibuja en un `canvas` a
640 × 360 con recorte centrado y se comprime a JPEG; si aun así pasa de 220 KB,
segunda pasada con más compresión. En la práctica cada portada queda en ~40 KB, y
el propio diálogo te dice cuánto ocupa la que acabas de poner. Si la cuota se
llena de todos modos, el guardado avisa en lugar de fallar en silencio.

### La portada viaja dentro de la plantilla

`cover`, `category` y `accent` son campos de `GameTemplate`, no de un almacén
aparte. Es deliberado: en un catálogo comunitario la cara del juego es parte de
lo que se comparte. Si viajaran por separado, **una plantilla importada llegaría
sin cara** y el catálogo del que la recibe se vería vacío. El motor los ignora
por completo — nada de esto entra en ningún cálculo.

La categoría alimenta el filtro lateral, que se construye solo a partir de lo que
haya: no hay una lista fija de géneros que alguien tenga que mantener.

### Probado de punta a punta

Importar los tres ejemplos → el lateral muestra *Gacha / Action RPG*, *Sandbox* y
*Souls-like* con su recuento → filtrar por *Sandbox* deja una tarjeta → buscar
«terr» desde la cabecera deja una → poner portada a las tres desde el diálogo →
**137 KB en total** en el navegador → el banner superior se llena solo con esas
mismas portadas → recargar la página y siguen ahí → la portada aparece dentro de
`template.cover` del paquete guardado. Sin scroll horizontal a 1400, 900 ni 400 px.

---

## El diagrama de fórmulas (React Flow)

La pestaña del optimizador mostraba las quince fórmulas de Genshin como un
bloque de código. Es correcto y es ilegible: para entender de dónde sale el DPS
hay que leer `dps`, buscar `totalAtk`, subir, buscar `critMult`, volver a subir.
La información está toda ahí; lo que hay que reconstruir en la cabeza es la
**relación** entre las piezas, que es justo lo que se quería entender.

Esa relación es un grafo dirigido acíclico, y el código ya lo conocía: es el
mismo que `topoSortDerived` recorre para saber en qué orden evaluar. Ahora se
dibuja, con **React Flow** — la librería que estaba prevista desde el principio
del proyecto.

### Se lee de izquierda a derecha

A la izquierda lo que aportan las piezas y el personaje; a la derecha el número
que se maximiza. Cuatro tipos de nodo: **estadística** (lo que suman los
objetos), **del personaje** (`base_*`), **intermedio** (valor derivado, con su
fórmula) y **objetivo**.

### Los números son los del motor, no una segunda cuenta

Tras optimizar, **cada nodo muestra su valor real en la build ganadora**. Es lo
que convierte el diagrama en una explicación: no «el DPS depende del ATQ total»,
sino «este DPS de 9.339,66 sale de estos 2.445,22 de ATQ total y este
multiplicador crítico de 2,36».

Y aquí está la decisión que importa: esos valores los calcula `explainBuild`,
que vive **dentro de `optimizer.ts`** y usa el mismo `buildLayout`, el mismo
índice de variables y el mismo orden topológico que la búsqueda.

La primera versión reimplementaba la evaluación en la capa de presentación y
daba **8.923 donde el motor daba 9.340**: se comía los selectores de elemento
del perfil (`base_sel_cryo` y compañía), que no son estadísticas declaradas y
por eso no entraban en su índice. Un diagrama que contradice al motor es peor
que no tener diagrama. Ahora hay una sola implementación, y
`npx tsx scripts/grafo.ts` lo verifica: resuelve de verdad y compara nodo
objetivo contra puntuación del motor, en los **13 objetivos** de las tres
plantillas. Los trece coinciden con error relativo < 1e-9.

### Agrupar no es esconder

`dmgBonus` de Genshin suma **veintiuna** variables: el bono de cada elemento y
su selector. Dibujadas una a una aplastan el grafo — obligan a alejar tanto el
lienzo que ya no se lee nada, y lo que se pierde es exactamente la estructura
que se venía a ver.

Cuando un nodo recibe seis o más entradas simples, se agrupan en un paquete que
**dice cuántas son, las nombra, y se abre de un clic**. El grafo de Genshin pasa
de 31 nodos ilegibles a **15 legibles**, sin ocultar nada: desplegar el paquete
devuelve los 31.

Un valor intermedio **nunca** se agrupa, porque es precisamente la estructura
que el diagrama viene a mostrar.

### Pulsar un nodo marca su linaje completo

No los vecinos inmediatos —eso responde «quién lo toca»—, sino **todo lo que
entra en él y todo a lo que acaba afectando**, que son las dos preguntas que
traen a alguien a un grafo así: «de dónde sale esto» y «a qué afecta si lo
cambio». El resto se atenúa.

### Accesibilidad: no se acepta la pérdida

Un lienzo de nodos es, por defecto, invisible para un lector de pantalla e
inservible sin ratón. Aquí no:

- cada nodo es **enfocable con Tab**, con un `aria-label` que dice su tipo, su
  nombre, su valor y de qué depende — todo lo que transmite el dibujo;
- **Enter o Espacio** selecciona igual que el clic, y los paquetes exponen
  `aria-expanded`;
- el **color nunca es el único portador de significado**: cada nodo lleva escrito
  su tipo («estadística», «intermedio», «objetivo»);
- **el código no desaparece**. Sigue a un clic, en la pestaña *Código*, porque
  para copiar una fórmula el texto es mejor herramienta que un diagrama.

### Un error que el diagrama destapó

El validador de grafos encontró una flecha que iba hacia atrás en Terraria: el
objetivo `maxLife` tiene el mismo id que la estadística `maxLife`, así que
ambos nodos se fundían en uno y producían un ciclo falso. Para el motor no hay
conflicto —el objetivo es una expresión, no una variable—, así que el grafo
tampoco debe tratarlo como tal: el nodo objetivo lleva ahora su propio prefijo.
Es un fallo que llevaba ahí desde el principio y que solo se ve cuando intentas
dibujar la estructura.

### Coste

React Flow pesa más que todo el motor junto, así que se carga **bajo demanda**:
el catálogo de juegos —la primera pantalla— no paga por una librería que quizá
no llegue a usarse. El paquete principal se queda en 120 KB comprimidos y el
diagrama son otros 63 KB que solo bajan al abrirlo.

---

## Despliegue

Zenith no tiene backend. El motor —branch and bound, parser, Web Worker— corre
entero en el navegador de quien lo usa; el servidor solo entrega archivos. Todo
lo necesario está en `deploy/`, y los detalles en
[`deploy/README-despliegue.md`](deploy/README-despliegue.md).

- **`deploy/serve.mjs`** — servidor estático de **cero dependencias**, solo el
  `http` de Node. Una dependencia en el servidor es una dependencia que
  actualizar y un CVE potencial en la máquina expuesta.

  Hace bien dos cosas que un `python3 -m http.server` hace mal: sirve los `.js`
  como `text/javascript` —sin eso el navegador **rechaza el Web Worker de tipo
  módulo** y la app carga pero no calcula nada—, y cachea eternamente los
  bundles con hash mientras nunca cachea el `index.html`.

- **`deploy/instalar-servidor.sh`** — deja el servicio systemd corriendo y
  arrancando al encender. Escucha en `127.0.0.1`, no en `0.0.0.0`: solo el
  túnel llega a él, así que no hay nada atacable desde la red local.

- **`deploy/desplegar.sh`** (y `desplegar.ps1` para Windows, que no trae bash ni
  rsync) — compila **en la máquina de desarrollo**, comprueba
  tipos, verifica que el diagrama sigue de acuerdo con el motor, valida las
  plantillas, y solo entonces manda ~1,5 MB de `dist/` por rsync. El servidor no
  necesita el toolchain, y un fallo de compilación se descubre antes de subir.

- **Túnel de Cloudflare** para el acceso desde fuera. La conexión la abre la
  laptop hacia Cloudflare, nunca al revés: URL con HTTPS sin abrir un puerto en
  el router.

### Lo que hay que avisar a quien lo pruebe

Sin decirlo, van a reportar como fallos cosas que son el diseño. Cada persona
tiene su propio `localStorage`, así que **el catálogo les aparece vacío** y cada
uno importa sus juegos y su GOOD; no comparten inventario porque Zenith es
offline-first y no guarda nada en ningún servidor. Y si cambia la URL del túnel,
cambia el origen y con él el almacenamiento: conviene exportar los juegos antes
de rotarla.

### Probado

La suite completa contra `deploy/serve.mjs` (no contra `vite preview`): importar
Genshin, cargar 2.622 objetos desde un GOOD, abrir el diagrama —que llega por
carga diferida— y optimizar. **El Web Worker arranca**, que es exactamente lo que
rompería un MIME mal servido: score 9.340 en el panel, 9.339,66 en el nodo
objetivo del grafo. Sin errores de consola.
