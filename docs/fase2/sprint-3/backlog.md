# Sprint 3 — Backlog

Estado al cierre, el 15 de noviembre de 2026. Fuente: Jira, proyecto `ZO`, sprint 7
("Sprint 3 — App real e inventario"), consultado por API el 20 de noviembre de 2026.

## Cerradas (25 HUs · 126 puntos)

| HU | Título | Pts | Evidencia |
|---|---|---|---|
| ZO-7 · SIM-01 | Panel de estadísticas actuales con imágenes | 8 | `features/optimizer/StatsPanel.tsx`, `da98ffb` |
| ZO-9 · SIM-03 | Historial de estadísticas previas por nivel | 5 | `features/optimizer/LevelHistoryPanel.tsx`, `useLevelHistory.ts` |
| ZO-10 · SIM-04 | Comparativa triple en una sola vista | 8 | `features/optimizer/BuildComparison.tsx` |
| ZO-47 · SIM-06 | Ver el catálogo de habilidades | 3 | `features/skills/SkillCatalog.tsx` |
| ZO-48 · SIM-07 | Calcular mi mejor build | 13 | `libs/core-engine/src/lib/optimizer.ts`, `useOptimizer.ts` |
| ZO-49 · SIM-05 | Explorar el árbol de habilidades | 8 | `features/skills/SkillTreeCanvas.tsx`, `libs/core-engine/skills.ts` |
| ZO-50 · SIM-08 | Comparar dos configuraciones | 5 | `features/optimizer/BuildComparison.tsx`, `BuildCard.tsx` |
| ZO-21 · CFG-15 | Importar la configuración desde un archivo | 5 | `6999e03` (importación GOOD) |
| ZO-25 · CFG-19 | Creación de optimizadores por la comunidad | 8 | `45e3a52` (hub real con Supabase) |
| ZO-32 · AUT-3 | Gestión de perfil de usuario | 3 | `00d0072` (biografía en el perfil) |
| ZO-41 · AUT-4 | Personalizar el aspecto visual de mi perfil | 3 | `features/auth/ProfilePage` |
| ZO-33 · INV-3 | Agregar objetos a mi inventario | 5 | `features/inventory/ItemForm.tsx`, `useInventory.ts` |
| ZO-34 · INV-4 | Ver y modificar los objetos de mi inventario | 5 | `features/inventory/InventoryPage.tsx`, `CatalogPanel.tsx` |
| ZO-35 · INV-5 | Eliminar objetos de mi inventario | 2 | `features/inventory/useInventory.ts` |
| ZO-37 · INV-7 | Importar mi inventario | 5 | `features/inventory/ImportPanel.tsx`, `6999e03` (F6.2) |
| ZO-52 · TEC-02 | Definir esquema de tablas y migraciones | 5 | `supabase/migrations/` |
| ZO-54 · TEC-04 | IndexedDB con Dexie y esquema local | 5 | `15e72c4` (persistencia local) |
| ZO-55 · TEC-05 | Repositorio local (CRUD de inventario) | 5 | `libs/data-access` |
| ZO-56 · TEC-06 | Repositorio remoto (CRUD de optimizadores y votos) | 5 | `features/catalog/supabase-catalog-repository.ts` |
| ZO-57 · TEC-07 | Tipos e interfaces compartidas | 3 | `libs/shared-types` |
| ZO-61 · TEC-11 | Infraestructura de pruebas (Vitest y Playwright) | 3 | `vitest.config.mts`, `apps/web-e2e` |
| ZO-63 · TEC-13 | Enrutamiento y layout (React Router) | 3 | `22f5d22` (shell V4) |
| ZO-64 · TEC-14 | CI/CD con GitHub Actions | 5 | `f8adce1` |
| ZO-65 · TEC-15 | Internacionalización (i18next) | 3 | `i18next` en dependencias y recursos |
| ZO-69 · TEC-19 | Gestión de estado global | 3 | `features/optimizer/workspace` |

## Arrastradas al Sprint 4 (14 HUs · 56 puntos)

| HU | Título | Pts | Estado al cierre |
|---|---|---|---|
| ZO-8 · SIM-02 | Simulación de estadísticas futuras por nivel | 5 | En revisión |
| ZO-19 · CFG-13 | Guardar la configuración como plantilla | 5 | Por hacer |
| ZO-20 · CFG-14 | Exportar la configuración de un juego | 3 | Por hacer |
| ZO-22 · CFG-16 | Ver el historial de cambios y versiones | 8 | Por hacer |
| ZO-24 · HUB-02 | Sistema de votación de optimizadores | 5 | Por hacer |
| ZO-26 · CFG-20 | Edición y eliminación de optimizadores | 5 | En revisión |
| ZO-27 · HUB-21 | Guardado de optimizadores como favoritos | 3 | Por hacer |
| ZO-28 · HUB-22 | Compartir optimizadores | 3 | Por hacer |
| ZO-29 · HUB-23 | Reporte de optimizadores inapropiados | 3 | Por hacer |
| ZO-36 · INV-6 | Exportar mi inventario | 3 | Por hacer |
| ZO-51 · TEC-01 | Proyecto Supabase y autenticación | 3 | En revisión |
| ZO-53 · TEC-03 | Reglas de seguridad (RLS) en Supabase | 5 | En revisión |
| ZO-73 · CFG-03 | Editar un atributo base de un juego | 3 | Por hacer |
| ZO-74 · CFG-04 | Eliminar un atributo base de un juego | 2 | Por hacer |

## Resumen

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 25 | 126 |
| En revisión | 4 | 18 |
| Por hacer | 10 | 38 |
| **Comprometido** | **39** | **182** |

Cumplimiento: **126 / 182 = 69 %**.

## Lectura

- **Se completaron 126 puntos**, más que en cualquier sprint anterior. El porcentaje bajo no
  indica poco trabajo, sino que se comprometió el doble.
- **Las cuatro historias en revisión al cierre son técnicas** (TEC-01, TEC-03, SIM-02 y CFG-20).
  El trabajo estaba hecho y faltaba la verificación.
- **Las diez historias en «Por hacer» son funcionalidades de configuración y comunidad**, es decir,
  lo que depende del editor y de la capa social. Ninguna bloqueaba la demostración.
- En Jira, las catorce arrastradas quedaron en el Sprint 4 durante el ordenamiento del 20 de
  noviembre. El sprint 7 conserva las 25 cerradas.
