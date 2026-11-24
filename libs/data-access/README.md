# data-access

Persistencia local del jugador sobre IndexedDB mediante Dexie. Almacena inventario, equipo,
perfiles base, historial de niveles, habilidades y preferencias. No se comunica con Supabase: esa
responsabilidad reside en `apps/web/src/lib/supabase.ts`.

## Propósito

Los datos del jugador no salen del dispositivo, salvo que el usuario inicie sesión y decida
sincronizarlos. Esta librería constituye esa frontera: todo lo que se persiste de forma local pasa
por ella.

## Diseño: puertos y adaptadores

`ports.ts` define interfaces, no implementaciones. Los archivos `*.repo.ts` las implementan sobre
Dexie.

| Puerto | Qué persiste |
|---|---|
| `GameRepository` | juegos y plantillas locales; `games` actúa como caché |
| `InventoryRepository` | piezas del inventario del jugador |
| `EquipmentRepository` | equipo equipado por personaje |
| `ProfileBaseRepository` | estadísticas base del perfil |
| `LevelHistoryRepository` | instantáneas de progresión (`LevelSnapshot`) |
| `SkillsRepository` | selección de habilidades |
| `ImagesRepository` | mapa de imágenes (`ImageMap`) |
| `SettingsRepository` | preferencias (`get`, `set`, `remove`) |

La interfaz permite reemplazar la implementación sin modificar la interfaz de usuario. Actualmente
existe una sola implementación (Dexie), por lo que la abstracción es delgada y no ceremonial.

## API pública

`src/index.ts` re-exporta:

- **Puertos:** `ports.ts`, con las interfaces y `GameInput`.
- **Implementaciones:** `inventory.repo`, `equipment.repo`, `games.repo`, `images.repo`,
  `levels.repo`, `profile-base.repo`, `settings.repo`, `skills.repo`, `package`.
- **Base:** `db.js` (esquema Dexie), `browser.js` (detección de entorno), `errors.js`.
- **Flujos:** `inventory-import.js`, `events.js`, `template.js`.

## Separación entre caché y datos del jugador

`games` almacena plantillas de juego descargadas y funciona como caché: se puede borrar sin
consecuencias. Los datos del jugador (inventario, equipo e historial) se eliminan por separado.
Mezclar ambas categorías haría que limpiar la caché destruyera el progreso.

## Pruebas

```bash
npx nx test data-access
```

Son 72 pruebas en 11 archivos. Se ejecutan contra `fake-indexeddb`, una implementación real en
memoria y no un mock. Un mock habría ocultado errores de índices y transacciones, que son
precisamente los defectos que esta librería debe detectar.

## Dependencias

`@zenith/shared-types`, `dexie` y `dexie-react-hooks`. Este último se utiliza para los hooks de
lectura reactiva en la interfaz.
