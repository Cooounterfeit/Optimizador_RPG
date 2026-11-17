# Changelog

Cambios relevantes del proyecto, agrupados por **funcionalidad** y no por commit. El formato
sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); el proyecto no usa tags
todavía, así que las versiones reflejan hitos del plan (`F1`…`F7`).

**Regla:** todo PR que cambie comportamiento visible agrega una línea en `Unreleased`.
Quien cierra el sprint la mueve a la versión correspondiente.

## [Unreleased]

### Added

- Editor de nodos y compilador de grafo a funciones ejecutables (planificado).
- Umbral de cobertura en `libs/` y pruebas de accesibilidad en e2e (planificado).

## [F7] — Simulación y optimizador

### Added

- Optimizador end-to-end: selección de objetivo, restricciones, ejecución en Web Worker y
  resultado con progreso visible.
- Historial de niveles y panel de comparación de builds.
- Selección de habilidades integrada al cálculo de estadísticas.
- Vitest sobre el repositorio definitivo: 514 pruebas verdes.

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
