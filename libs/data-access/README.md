# data-access

Persistencia **local** del jugador sobre IndexedDB (Dexie). Guarda inventario, equipo,
perfiles base, historial de niveles, habilidades y preferencias. No habla con Supabase: eso
vive en `apps/web/src/lib/supabase.ts`.

## Por qué existe

Los datos del jugador no salen del dispositivo salvo que el usuario inicie sesión y decida
sincronizar. Esta librería es esa frontera: todo lo que se persiste localmente pasa por acá.

## Diseño: puertos y adaptadores

`ports.ts` define **interfaces**, no implementaciones. `*.repo.ts` las implementa sobre Dexie.

| Puerto | Qué persiste |
|---|---|
| `GameRepository` | Juegos y plantillas locales; `games` es caché |
| `InventoryRepository` | Piezas del inventario del jugador |
| `EquipmentRepository` | Equipo equipado por personaje |
| `ProfileBaseRepository` | Estadísticas base del perfil |
| `LevelHistoryRepository` | Instantáneas de progresión (`LevelSnapshot`) |
| `SkillsRepository` | Selección de habilidades |
| `ImagesRepository` | Mapa de imágenes (`ImageMap`) |
| `SettingsRepository` | Preferencias (`get` / `set` / `remove`) |

La interfaz permite cambiar la implementación sin tocar la UI. Hoy hay una sola implementación
—Dexie— y por eso esa abstracción es delgada, no ceremonial.

## API pública

`src/index.ts` re-exporta:

- **Puertos:** `ports.ts` (interfaces y `GameInput`).
- **Implementaciones:** `inventory.repo`, `equipment.repo`, `games.repo`, `images.repo`,
  `levels.repo`, `profile-base.repo`, `settings.repo`, `skills.repo`, `package`.
- **Base:** `db.js` (esquema Dexie), `browser.js` (detección de entorno), `errors.js`.
- **Flujos:** `inventory-import.js`, `events.js`, `template.js`.

## Separación importante

`games` guarda **plantillas de juego descargadas**: es caché, se puede borrar. Los datos del
jugador (inventario, equipo, historial) se borran por separado. Mezclarlos haría que limpiar
la caché destruyera el progreso.

## Pruebas

```bash
npx nx test data-access   # 72 pruebas, 11 archivos
```

Se ejecutan contra `fake-indexeddb`: una implementación real en memoria, no un mock. Un mock
habría ocultado errores de índices y transacciones — exactamente lo que hay que probar acá.

## Dependencias

`@zenith/shared-types`, `dexie` y `dexie-react-hooks` (este último para los hooks de lectura
reactiva en la UI).
