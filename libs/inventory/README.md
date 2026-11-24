# inventory

Interpreta inventarios de la comunidad y las reglas que cada juego declara para importarlos. No
depende de un juego concreto: todo lo específico proviene de los datos.

## Propósito

Los scanners de la comunidad exportan en formatos distintos. En lugar de escribir un parser por juego, esta librería lee un `InventoryPointer` desde la plantilla del juego. Aplica las reglas que ese juego declara. Un juego nuevo requiere un archivo nuevo y no código nuevo.

## API pública

### Catálogo

| Función | Propósito |
|---|---|
| `loadInventoryCatalog(pointer)` | carga y valida el catálogo, con caché en memoria |
| `clearInventoryCatalogCache()` | limpia la caché; se usa en pruebas y en cambios de versión |

`InventoryCatalogSchema` valida con Zod: `kind: 'inventory'`, `entries[]` y `curves`.

### Entradas

| Función | Propósito |
|---|---|
| `listEntries(catalog)` | genera el resumen de cada entrada para listar en la interfaz |
| `entryStats(entry, curves, level, ascension, rules)` | calcula las estadísticas de una pieza en un nivel |
| `entryStatsByKey(catalog, rules, key, level, ascension?)` | aplica el mismo cálculo, buscando por clave |
| `entryItem(catalog, rules, key, level, ...)` | convierte la entrada al `Item` del contrato del motor |

### Reglas y formato

| Función | Propósito |
|---|---|
| `inventoryPointer(template)` | extrae el puntero de inventario de la plantilla |
| `inventoryRules(template)` | obtiene las reglas declaradas por el juego: rango de nivel, etiquetas y curvas |
| `mapSlot(rules, key)` | traduce la ranura del formato externo a la del juego |

`InventoryRulesSchema` incluye `LevelRangeSchema`, `InventoryLabelsSchema` y `MainStatCurveSchema`.

### Formato GOOD

`formats/good.ts` interpreta el formato GOOD, el más difundido entre los scanners de la comunidad.

## Ejemplo de uso

```ts
import { entryItem, inventoryPointer, inventoryRules, loadInventoryCatalog } from '@zenith/inventory';

const pointer = inventoryPointer(template);
const rules = inventoryRules(template);
if (!pointer || !rules) return; // el juego no declara inventario importable

const catalog = await loadInventoryCatalog(pointer);
const key = catalog.entries[0]?.key;
if (key) {
  const item = entryItem(catalog, rules, key, 90);
}
```

## Pruebas

```bash
npx nx test inventory
```

Son 29 pruebas en 5 archivos. Verifican el parseo de formatos, la conversión con reglas de nivel y
los casos borde de entradas incompletas.

## Dependencias

Solo `@zenith/shared-types` (contrato) y `zod`. No depende de React, del DOM ni del almacenamiento.
