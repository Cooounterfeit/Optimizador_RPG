# Changelog

Cambios relevantes del proyecto, agrupados por **funcionalidad** y no por commit. El formato
sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); el proyecto no usa tags
todavía, así que las versiones reflejan hitos del plan (`F1`…`F7`).

**Regla:** todo PR que cambie comportamiento visible agrega una línea en `Unreleased`.
Quien cierra el sprint la mueve a la versión correspondiente.

## [Unreleased]

### Added

- **Overview como portada del optimizador (`6.3.2`).** Sección nueva en el rail (`/optimizer/:id`)
  con portada, nombre, descripción, categoría, los cinco contadores y las notas de la plantilla;
  cierra con el botón a Optimize, que pasa a `/optimizer/:id/optimize` con un encabezado de una
  línea en vez de la cabecera completa.
- **Tarjeta de objeto al pasar el cursor (`6.3.3`).** `ItemHoverCard` muestra ranura, nombre,
  conjunto, rareza, nivel, stats y requisitos de la pieza al pasar el cursor o al recibir foco. Va
  en portal con `position: fixed` para no quedar recortada por el selector de ranura ni la tabla, y
  se monta en el resultado, "Mi build", la hoja de personaje y el selector de ranura.
- **Una sola tarjeta de personaje (`6.3.4`).** `CharacterPanel` reemplaza a `StatsPanel`: retrato,
  nombre, "Change" como acción propia y el nivel editable como campo numérico que confirma al salir
  del campo o con Enter, recorta al rango y revierte con Escape.
- **Guardar el optimizador en tu cuenta.** Un botón en la configuración sube la plantilla
  a Supabase bajo tu usuario, y al guardar eliges si queda privada o compartida con la
  comunidad, decisión que se puede cambiar después. Sin sesión el botón lleva a iniciar
  sesión y vuelve a donde estabas; sin cuentas configuradas lo dice en vez de fallar. Lo que
  sube es el optimizador, es decir la matemática: los objetos del jugador se quedan en su
  navegador y se importan por JSON o se escriben a mano.
- **El botón de guardar está siempre, y dice por qué no se puede.** Antes desaparecía en una
  instalación sin cuentas configuradas, y quien lo buscaba concluía que el guardado no
  existía. Ahora aparece en todos los casos y, cuando no se puede guardar, queda apagado con
  la razón debajo. Guardar exige además que la validación esté limpia: un optimizador con
  bloques obligatorios vacíos o con errores del motor no sube, porque publicaría algo que
  nadie puede ejecutar.
- **La lista de borradores dice dónde vive cada uno.** Una tarjeta guardada muestra si está
  en tu cuenta o compartida, y desde el menú se puede quitar de la cuenta conservando el
  borrador local. La nota de la sección dejó de afirmar que todo vive solo en este navegador,
  que desde el botón de guardar era falso.
- **El nombre del optimizador llega a 100 caracteres en la base.** La tabla estaba en 80 y
  el formulario de CFG-05 en 100, así que un nombre de 90 se guardaba en el navegador y
  reventaba al subirlo.
- **Crear un optimizador desde cero** (CFG-05). Un formulario de tres campos crea un juego
  vacío pero válido, sin pedir cuenta, y lleva directo a su configuración.
- **Ver y validar la configuración de un juego** (CFG-06). Primera pantalla que consume
  `validateTemplate`: muestra qué partes faltan, el informe del motor y los auto-tests.
- **Crear un atributo base** (CFG-01). Nombre y unidad obligatorios; acumulación y grupo
  opcionales. El identificador se deriva del nombre y se muestra en el listado.
- **Listar los atributos** (CFG-02). Búsqueda parcial por nombre, orden alfabético por
  defecto con vuelta al orden de la plantilla, y en cuántos sitios se usa cada uno.
- **Editar un atributo** (CFG-03). El formulario se abre en la propia fila, con los datos
  puestos. Cambiar cómo acumula una estadística que ya se usa pide confirmación, porque
  altera todos los resultados sin producir ningún error.
- **Eliminar un atributo** (CFG-04). Si no lo usa nadie se borra directo. Si lo usa algo, se
  enseña qué desaparece por completo y qué solo pierde ese valor, y hay que confirmarlo. El
  borrado encadena: si cae un valor derivado, también cae el objetivo que lo usaba.
- Editor de nodos y compilador de grafo a funciones ejecutables (planificado).
- Umbral de cobertura en `libs/` y pruebas de accesibilidad en e2e (planificado).


### Fixed

- **Un botón deshabilitado no se veía deshabilitado.** El componente solo quitaba el puntero,
  sin ningún cambio visual, así que en toda la aplicación un botón apagado parecía pulsable.
- **Borrar un borrador guardado dejaba su fila huérfana en la nube.** Se limpiaba el
  navegador y el optimizador seguía en Supabase para siempre, inalcanzable desde la interfaz
  porque el vínculo vivía justo en la fila local recién borrada. Ahora el borrado se lleva las
  dos copias, lo avisa antes, y si la nube falla no borra nada.

- **Nueve comprobaciones del motor no se ejecutaban desde la aplicación.** La pantalla de
  configuración llamaba a `validateTemplate` sin el inventario, y nueve de las 54
  comprobaciones solo corren con él. El espacio de búsqueda, que se calcula en ese mismo
  bloque, salía siempre como `n/a`.
- **Un id de estadística con guion rompía las fórmulas sin avisar.** El validador miraba
  ids duplicados pero no su forma, y el tokenizador lee `ataque-critico` como una resta.
  Ahora se rechaza al validar, venga del formulario, de un paquete importado o de una
  plantilla escrita a mano.
- **La pantalla de configuración separa los dos guardados.** El del navegador es automático
  y privado; el de la cuenta es el botón. Nada lo decía donde se está trabajando, y quien
  buscaba el botón asumía que no se había guardado nada. El texto se había añadido a la
  copia sin llegar a pintarse en ninguna parte; ahora sale junto al botón.
- **Menú de acciones en cada borrador.** Los tres puntos, dentro del mismo marco del
  nombre, abren renombrar, duplicar y borrar. Renombrar no toca el id, porque lo usan las
  claves del inventario. Duplicar se lleva también las piezas y queda registrado como copia.
- **Tampoco había forma de borrarlos.** `remove` y `clearLocalData` existían en el
  repositorio y no los llamaba nadie, así que los borradores solo se acumulaban. Ahora se
  borran desde la portada, y la confirmación dice cuántas piezas del inventario se lleva
  por delante, porque no hay deshacer.
- **No había forma de volver a un borrador.** Nada en la interfaz listaba los
  optimizadores creados en este navegador: se entraba al crearlo y al volver al menú
  desaparecía de la vista, aunque siguiera guardado. La portada ahora los lista, y
  distingue los propios de la copia en caché de los del catálogo.
- **El botón de editar de cada fila se anunciaba como "EditAtaque".** El nombre del atributo
  se concatenaba sin separador en el árbol de accesibilidad. Ahora el nombre accesible es
  explícito.
- **La copia local de las plantillas era de solo escritura.** Se guardaba en IndexedDB todo
  lo que se cargaba, pero nadie la leía. Un juego creado en el editor no se podía abrir sin
  publicarlo.
- **Producción servía el prototipo archivado.** El proyecto de Vercel estaba configurado para
  construir `demo/`. Ahora construye `apps/web` (`npx nx build web` → `apps/web/dist`): la URL
  de producción responde con la versión final. Verificado el título, el SPA fallback, el cache
  de assets y las cabeceras de seguridad.
- `zod` 4.6.5 → 4.6.7: agotamiento de memoria al validar colecciones sobredimensionadas
  (CWE-770). Relevante porque se validan plantillas de juego enviadas por la comunidad.
- `react-router-dom` 6.30.3 → 6.30.6: open redirect hacia XSS.

### Changed

- El despliegue usa la **integración de Git de Vercel** en vez de un workflow con la CLI. Sin
  secrets de Vercel en GitHub Actions: los previews de PR son el ambiente de staging.
- `nx.json` apuntaba a la rama `master`; ahora a `main`, que es la real.
- `.nvmrc` pedía Node 26.7.0; ahora 22, que es lo que usan CI y Docker.

## [F7] — Simulación y optimizador

### Added

- Optimizador end-to-end: selección de objetivo, restricciones, ejecución en Web Worker y
  resultado con progreso visible.
- Historial de niveles y panel de comparación de builds.
- Selección de habilidades integrada al cálculo de estadísticas.
- Vitest sobre el repositorio definitivo: 520 pruebas verdes.

## [F6] — Inventario y catálogo

### Added

- Juego semilla con inventario importable en formato de la comunidad (`F6.1`).
- Catálogo de piezas con importación GOOD e imágenes (`F6.2`).
- Assets y catálogos fuera del código: el motor deja de conocer un juego concreto (`F6.3`).
- Reglas de juego definidas en datos, no en el código (`F6.4`).
- Hoja de personaje con nivel libre y selector en rejilla (`6.2b`).

### Fixed

- Coherencia entre las estadísticas mostradas y el cálculo real (`6.1`).
- Límite de tiempo expresado en segundos y clave de caché por contenido real.

## [F5] — Cuentas y hub

### Added

- Hub de optimizadores con diseño V4 (`F4`).
- Autenticación, perfil y biografía con Supabase (`AUT-3`).
- Esquema de base versionado en el repositorio con políticas RLS probadas contra PGlite.

### Changed

- `shared-types` genera sus tipos de dominio desde el esquema de Supabase.

## [F3] — Persistencia local

### Added

- Persistencia del inventario con Dexie sobre IndexedDB.
- Pruebas de repositorios contra `fake-indexeddb`, no contra mocks.

### Changed

- `games` es caché: los datos del jugador se borran por separado.

## [F1–F2] — Fundaciones

### Added

- Monorepo NX 23 con `apps/web` y `libs/shared-types` (`TEC-10`).
- Contrato de juego completo validado con Zod.
- Motor portado desde el prototipo con pruebas unitarias.
- Integración continua: pruebas y build en GitHub Actions.
- Prototipo v2 archivado en `demo/` como referencia histórica.

### Changed

- Versión de Node fijada en `.nvmrc`; saltos de línea normalizados.
- Fijados los scripts de instalación de dependencias nativas.
