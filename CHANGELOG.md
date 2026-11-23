# Changelog

Cambios relevantes del proyecto, agrupados por **funcionalidad** y no por commit. El formato
sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); el proyecto no usa tags
todavía, así que las versiones reflejan hitos del plan (`F1`…`F7`).

**Regla:** todo PR que cambie comportamiento visible agrega una línea en `Unreleased`.
Quien cierra el sprint la mueve a la versión correspondiente.

## [Unreleased]

### Added

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
- Editor de nodos y compilador de grafo a funciones ejecutables (planificado).
- Umbral de cobertura en `libs/` y pruebas de accesibilidad en e2e (planificado).


### Fixed

- **Nueve comprobaciones del motor no se ejecutaban desde la aplicación.** La pantalla de
  configuración llamaba a `validateTemplate` sin el inventario, y nueve de las 54
  comprobaciones solo corren con él. El espacio de búsqueda, que se calcula en ese mismo
  bloque, salía siempre como `n/a`.
- **Un id de estadística con guion rompía las fórmulas sin avisar.** El validador miraba
  ids duplicados pero no su forma, y el tokenizador lee `ataque-critico` como una resta.
  Ahora se rechaza al validar, venga del formulario, de un paquete importado o de una
  plantilla escrita a mano.
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
