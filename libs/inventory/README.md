# inventory

Interpreta **inventarios de la comunidad** y las reglas que cada juego declara para
importarlos. No depende de un juego concreto: todo lo específico viene en los datos.

## Por qué existe

Los scanners de la comunidad exportan en formatos distintos. En vez de escribir un parser por
juego, esta librería lee un `InventoryPointer` desde la plantilla del juego y aplica las
reglas que ese juego declara. Un juego nuevo = un archivo nuevo, no código nuevo.

## API pública

### Catálogo

| Función | Qué hace |
|---|---|
| `loadInventoryCatalog(pointer)` | Carga y valida el catálogo (con caché en memoria) |
| `clearInventoryCatalogCache()` | Limpia la caché — tests y cambios de versión |

`InventoryCatalogSchema` valida con Zod: `kind: 'inventory'`, `entries[]` y `curves`.

### Entradas

| Función | Qué hace |
|---|---|
| `listEntries(catalog)` | Resumen de cada entrada para listar en UI |
| `entryStats(entry, curves, level, ascension, rules)` | Estadísticas de una pieza en un nivel |
| `entryStatsByKey(catalog, rules, key, level, ascension?)` | Igual, buscando por clave |
| `entryItem(catalog, rules, key, level, ...)` | Convierte la entrada al `Item` del contrato del motor |

### Reglas y formato

| Función | Qué hace |
|---|---|
| `inventoryPointer(template)` | Extrae el puntero de inventario de la plantilla |
| `inventoryRules(template)` | Reglas declaradas por el juego (rango de nivel, etiquetas, curvas) |
| `mapSlot(rules, key)` | Traduce la ranura del formato externo a la del juego |

`InventoryRulesSchema` incluye `LevelRangeSchema`, `InventoryLabelsSchema` y
`MainStatCurveSchema`.

### Formato GOOD

`formats/good.ts` parsea el formato GOOD, el más difundido entre los scanners de la comunidad.

## Uso

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
npx nx test inventory   # 29 pruebas, 5 archivos
```

Se prueba el parseo de formatos, la conversión con reglas de nivel y los casos borde de
entradas incompletas.

## Dependencias

Solo `@zenith/shared-types` (contrato) y `zod`. Sin React, sin DOM, sin almacenamiento.
