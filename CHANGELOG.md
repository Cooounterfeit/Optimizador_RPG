# Changelog

Cambios relevantes del proyecto, agrupados por funcionalidad y no por commit. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto todavía no utiliza tags,
por lo que las versiones reflejan hitos del plan (`F1` a `F7`).

**Regla:** todo pull request que modifique un comportamiento visible agrega una línea en
`Unreleased`. Quien cierra el sprint la traslada a la versión correspondiente.

## [Unreleased]

### Added

- **Overview como portada del optimizador (`6.3.2`).** Sección nueva en el rail
  (`/optimizer/:id`) con portada, nombre, descripción, categoría, los cinco contadores y las notas
  de la plantilla. Cierra con el botón que conduce a Optimize, que pasa a `/optimizer/:id/optimize`
  con un encabezado de una línea en lugar de la cabecera completa.
- **Tarjeta de objeto al pasar el cursor (`6.3.3`).** `ItemHoverCard` muestra ranura, nombre,
  conjunto, rareza, nivel, estadísticas y requisitos de la pieza al pasar el cursor o al recibir
  foco. Se monta en portal con `position: fixed` para no quedar recortada por el selector de ranura
  ni por la tabla. Se incorpora en el resultado, en Mi build, en la hoja de personaje y en el
  selector de ranura.
- **Una sola tarjeta de personaje (`6.3.4`).** `CharacterPanel` reemplaza a `StatsPanel`. Incluye
  retrato, nombre, la acción Change como control propio y el nivel editable como campo numérico.
  El nivel confirma al salir del campo o con Enter, recorta al rango y revierte con Escape.
- **Guardar el optimizador en la cuenta.** Un botón en la configuración sube la plantilla a
  Supabase bajo el usuario. Al guardar, se elige si queda privada o compartida con la comunidad, y
  la decisión puede cambiarse después. Sin sesión, el botón conduce a iniciar sesión y regresa al
  punto de origen. Sin cuentas configuradas, lo declara en lugar de fallar. Lo que se sube es el
  optimizador, es decir, la matemática. Los objetos del jugador permanecen en su navegador y se
  importan por JSON o se escriben a mano.
- **El botón de guardar es flotante y acompaña todo el optimizador.** Permanece fijo abajo a la
  derecha, aparece en todas las secciones y siempre puede pulsarse. Las reglas se aplican al hacer
  clic. Sin sesión aparece un aviso con iniciar sesión o crear una cuenta. Si la plantilla está
  incompleta o el motor reporta errores, el diálogo indica qué falta.
- **Crear una cuenta devuelve al punto de origen.** El registro siempre dirigía al perfil, de modo
  que registrarse durante una edición dejaba al usuario lejos de su tarea.
- **La lista de borradores indica dónde reside cada uno.** Una tarjeta guardada muestra si está en
  la cuenta o compartida. El menú permite quitarla de la cuenta y conservar el borrador local. La
  nota de la sección dejó de afirmar que todo reside solo en este navegador.
- **Crear un juego ya no exige ser administrador.** Un usuario normal no podía guardar un
  optimizador de un juego ausente del catálogo. El insert en `game` es exclusivo de administradores
  y `optimizers.game_id` es obligatorio. Una función con permisos elevados lo registra en su
  nombre: exige sesión, reutiliza antes de crear y deja constancia del autor. El insert directo
  sigue reservado a administradores.
- **El nombre del optimizador alcanza 100 caracteres en la base.** La tabla estaba en 80 y el
  formulario de CFG-05 en 100. Un nombre de 90 se guardaba en el navegador y fallaba al subirlo.
- **Crear un optimizador desde cero** (CFG-05). Un formulario de tres campos crea un juego vacío y
  válido, sin pedir cuenta, y conduce directo a su configuración.
- **Ver y validar la configuración de un juego** (CFG-06). Es la primera pantalla que consume
  `validateTemplate`. Muestra qué partes faltan, el informe del motor y los auto-tests.
- **Crear un atributo base** (CFG-01). Nombre y unidad son obligatorios; acumulación y grupo son
  opcionales. El identificador se deriva del nombre y aparece en el listado.
- **Listar los atributos** (CFG-02). Ofrece búsqueda parcial por nombre y orden alfabético por
  defecto, con vuelta al orden de la plantilla. Indica además en cuántos sitios se usa cada uno.
- **Editar un atributo** (CFG-03). El formulario se abre en la propia fila, con los datos puestos.
  Cambiar la acumulación de una estadística en uso exige confirmación, porque altera todos los
  resultados sin producir ningún error.
- **Eliminar un atributo** (CFG-04). Si nadie lo usa, se borra directo. Si algo lo usa, se muestra
  qué desaparece por completo y qué solo pierde ese valor, y se exige confirmación. El borrado
  encadena: si cae un valor derivado, también cae el objetivo que lo usaba.
- Editor de nodos y compilador de grafo a funciones ejecutables (planificado).
- Umbral de cobertura en `libs/` y pruebas de accesibilidad en e2e (planificado).

### Fixed

- **El catálogo no mostraba nada.** La vista dejó de exponer `category` al normalizar los géneros,
  pero la consulta del hub seguía pidiéndola. PostgREST rechaza la consulta entera cuando una
  columna no existe. El hub pasa a leer `genres`, que es un arreglo porque un juego puede tener
  varios. La tarjeta muestra los dos primeros, las facetas cuentan cada género y el filtro deja
  pasar a quien tenga el elegido entre los suyos.
- **Un optimizador de la nube siempre se reportaba como no publicado.** La consulta dejó de pedir
  `published` al normalizar el catálogo de juegos, y el mapeo seguía leyéndolo. El resultado era
  `false` para todos.
- **Un botón deshabilitado no se veía deshabilitado.** El componente solo quitaba el puntero y no
  aplicaba ningún cambio visual. En toda la aplicación, un botón apagado parecía pulsable.
- **Borrar un borrador guardado dejaba su fila huérfana en la nube.** Se limpiaba el navegador y el
  optimizador seguía en Supabase para siempre. Resultaba inalcanzable desde la interfaz, porque el
  vínculo vivía en la fila local recién borrada. Ahora el borrado elimina las dos copias, avisa
  antes y no borra nada si la nube falla.
- **Nueve comprobaciones del motor no se ejecutaban desde la aplicación.** La pantalla de
  configuración llamaba a `validateTemplate` sin el inventario, y nueve de las 54 comprobaciones
  solo corren con él. El espacio de búsqueda, calculado en ese mismo bloque, salía siempre como
  `n/a`.
- **Un id de estadística con guion rompía las fórmulas sin avisar.** El validador revisaba ids
  duplicados pero no su forma, y el tokenizador lee `ataque-critico` como una resta. Ahora se
  rechaza al validar, provenga del formulario, de un paquete importado o de una plantilla escrita a
  mano.
- **La pantalla de configuración separa los dos guardados.** El del navegador es automático y
  privado; el de la cuenta corresponde al botón. Nada lo indicaba donde se trabaja, y quien buscaba
  el botón asumía que no se había guardado nada. El texto se había añadido a la copia sin llegar a
  pintarse; ahora aparece junto al botón.
- **Menú de acciones en cada borrador.** Los tres puntos, dentro del mismo marco del nombre, abren
  renombrar, duplicar y borrar. Renombrar no toca el id, porque lo usan las claves del inventario.
  Duplicar se lleva también las piezas y queda registrado como copia.
- **No existía forma de borrarlos.** `remove` y `clearLocalData` existían en el repositorio y nadie
  los llamaba, de modo que los borradores solo se acumulaban. Ahora se borran desde la portada, y
  la confirmación indica cuántas piezas del inventario se eliminan, porque no hay deshacer.
- **No existía forma de volver a un borrador.** Nada en la interfaz listaba los optimizadores
  creados en este navegador. Se entraba al crearlo, y al volver al menú desaparecía de la vista
  aunque siguiera guardado. La portada ahora los lista y distingue los propios de la copia en caché
  del catálogo.
- **El botón de editar de cada fila se anunciaba como «EditAtaque».** El nombre del atributo se
  concatenaba sin separador en el árbol de accesibilidad. Ahora el nombre accesible es explícito.
- **La copia local de las plantillas era de solo escritura.** Se guardaba en IndexedDB todo lo que
  se cargaba, pero nadie la leía. Un juego creado en el editor no se podía abrir sin publicarlo.
- **Producción servía el prototipo archivado.** El proyecto de Vercel estaba configurado para
  construir `demo/`. Ahora construye `apps/web` mediante `npx nx build web` hacia
  `apps/web/dist`, y la URL de producción responde con la versión final. Se verificaron el título,
  el SPA fallback, el cache de assets y las cabeceras de seguridad.
- `zod` 4.6.5 a 4.6.7: agotamiento de memoria al validar colecciones sobredimensionadas
  (CWE-770). Resulta relevante porque se validan plantillas de juego enviadas por la comunidad.
- `react-router-dom` 6.30.3 a 6.30.6: open redirect hacia XSS.

### Changed

- El despliegue utiliza la integración de Git de Vercel en lugar de un workflow con la CLI. No se
  usan secrets de Vercel en GitHub Actions, y los previews de pull request hacen de staging.
- `nx.json` apuntaba a la rama `master`; ahora apunta a `main`, que es la rama real.
- `.nvmrc` solicitaba Node 26.7.0; ahora indica 22, que es la versión usada por CI y Docker.

## [F7] — Simulación y optimizador

### Added

- Optimizador de extremo a extremo: selección de objetivo, restricciones, ejecución en Web Worker y
  resultado con progreso visible.
- Historial de niveles y panel de comparación de builds.
- Selección de habilidades integrada al cálculo de estadísticas.
- Vitest sobre el repositorio definitivo, con la suite completa en verde.

## [F6] — Inventario y catálogo

### Added

- Juego semilla con inventario importable en formato de la comunidad (`F6.1`).
- Catálogo de piezas con importación GOOD e imágenes (`F6.2`).
- Assets y catálogos fuera del código: el motor deja de conocer un juego concreto (`F6.3`).
- Reglas de juego definidas en datos y no en el código (`F6.4`).
- Hoja de personaje con nivel libre y selector en rejilla (`6.2b`).

### Fixed

- Coherencia entre las estadísticas mostradas y el cálculo real (`6.1`).
- Límite de tiempo expresado en segundos y clave de caché por contenido real.

## [F5] — Cuentas y hub

### Added

- Hub de optimizadores con diseño V4 (`F4`).
- Autenticación, perfil y biografía con Supabase (`AUT-3`).
- Esquema de base versionado en el repositorio, con políticas RLS probadas contra PGlite.

### Changed

- `shared-types` genera sus tipos de dominio desde el esquema de Supabase.

## [F3] — Persistencia local

### Added

- Persistencia del inventario con Dexie sobre IndexedDB.
- Pruebas de repositorios contra `fake-indexeddb`, no contra mocks.

### Changed

- `games` funciona como caché y los datos del jugador se eliminan por separado.

## [F1–F2] — Fundaciones

### Added

- Monorepo NX 23 con `apps/web` y `libs/shared-types` (`TEC-10`).
- Contrato de juego completo validado con Zod.
- Motor portado desde el prototipo con pruebas unitarias.
- Integración continua: pruebas y build en GitHub Actions.
- Prototipo v2 archivado en `demo/` como referencia histórica.

### Changed

- Versión de Node fijada en `.nvmrc` y saltos de línea normalizados.
- Fijados los scripts de instalación de dependencias nativas.
