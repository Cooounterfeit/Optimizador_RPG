# Traspaso: `category` → géneros del catálogo

Estado: **base de datos aplicada en local, staging y producción**. Falta adaptar `apps/web`.
Este documento es para quien haga ese cambio; **no requiere tocar `supabase/`**.

> **El listado del hub está roto en producción ahora mismo.** La vista
> `optimizer_cards` ya no expone `category`, y la app desplegada sigue pidiéndola.
> PostgREST responde `400` y el listado queda vacío. El arreglo está en la sección
> [Qué hay que cambiar en `apps/web`](#qué-hay-que-cambiar-en-appsweb).

## Qué cambió en la base

Nueve migraciones en total, todas append-only:

| Migración | Qué hace |
|---|---|
| `20261122000001_integridad_rendimiento.sql` | Auditoría de `reports`, recálculo del puntaje por sentencia, `cover` como columna generada e índices que faltaban. |
| `20261123000001_catalogo_juegos.sql` | Crea el catálogo normalizado: `game`, `genre`, `game_genre` (M:N) y `game_alias`, más `optimizers.game_id`. |
| `20261124000001_unificar_juego.sql` | Enlaza cada optimizador a un juego del catálogo y **elimina `optimizers.game_name`**. La vista resuelve el nombre con un join. |
| `20261125000001_privilegios_por_defecto.sql` | Los objetos nuevos en `public` ya no nacen con permisos para `anon`/`authenticated`. |
| `20261125000002_vista_con_generos.sql` | `optimizer_cards` expone `game_id` y `genres text[]`; **desaparece `optimizers.category`**. |
| `20261125000003_gifts_y_stripe_events.sql` | Crea `subscription_gifts` y `stripe_events`. |

Aparte, se recuperaron los géneros que vivían en `category`: `Genshin Impact` →
`Action RPG`, `Gacha`; `RPG clasico` → `RPG`. `Astral Forge` tenía `category` vacía y
queda sin géneros, igual que antes.

## Forma nueva de `optimizer_cards`

```
id, name, description, game_id, game_name, genres, cover, score,
votes_count, created_at, author_id, author_name, author_avatar
```

`genres` es `text[]` **siempre** (arreglo vacío si el juego no tiene géneros, nunca
`NULL`) y viene ordenado alfabéticamente por el `order by` del `array_agg`.

## Por qué

`category` era una columna generada desde `template->>'category'`, texto libre que el
autor escribía en el `.zenith.json`. Eso permitía que el mismo juego apareciera como
`ARPG` en una build y `Action RPG` en otra (el hub tenía las dos formas en sus
fixtures). El catálogo normalizado `game` + `genre` + `game_genre` es M:N, así que un
juego puede tener varios géneros y el vocabulario queda en un solo lugar. Además,
`category` nunca fue un dato del optimizador: es una propiedad del juego.

## Qué hay que cambiar en `apps/web`

La app **compila y sus tests pasan hoy** porque los tests usan fixtures, no la base. El
fallo aparece en runtime: la consulta pide `category`, que ya no existe, y PostgREST
responde `400`.

### 1. `src/lib/database.types.ts`

En `OptimizerCardRow` (líneas 28-43): quitar `category` y agregar

```ts
game_id: string;
genres: string[];
```

### 2. `src/features/catalog/supabase-catalog-repository.ts`

`COLUMNS` (líneas 6-19): reemplazar `'category'` por `'game_id'` y `'genres'`.
`mapCard` (línea 24): reemplazar `category: row.category ?? undefined` por
`genres: row.genres`.

### 3. `src/features/catalog/types.ts`

`CatalogOptimizer.category?: string` → `genres: string[]` (obligatorio, porque la vista
siempre devuelve arreglo). Conviene agregar `gameId: string` para que el hub agrupe por
juego.

### 4. `src/features/catalog/filters.ts`

El filtro deja de ser una categoría por optimizador y pasa a ser género, con dos
diferencias de comportamiento que hay que decidir explícitamente:

- **Un optimizador puede estar en varios géneros.** `categoryFacets` tiene que contar
  cada género del arreglo, no uno.
- `UNCATEGORIZED` hoy agrupa los que no tienen categoría. Con géneros, el equivalente
  es el arreglo vacío; conservalo o eliminalo, pero no dejes el filtro comparando
  contra `undefined`.

Firma sugerida: `CatalogFilterState.category` → `genre: string`, y en
`filterOptimizers`:

```ts
state.genre === 'all' || optimizer.genres.includes(state.genre)
```

### 5. `src/features/catalog/components/FilterRail.tsx`

Renombrar `CategoryFacet`/`onCategory` a `GenreFacet`/`onGenre` y `state.category` a
`state.genre`. El título del panel ya dice `Genres` (`copy.ts:18`); solo el código
quedó con el nombre viejo.

### 6. `src/features/catalog/components/OptimizerCard.tsx:36-40`

La etiqueta de la esquina muestra `optimizer.category`. Con `genres` hay que elegir uno
(mostrar el primero, o los dos primeros). Es una decisión de diseño, no de datos.

### 7. `src/features/optimizer/OverviewPage.tsx:42-46`

Muestra `template.category` del juego abierto. **Esto no depende de la base**:
`template` viene del `.zenith.json` y el esquema del paquete
(`libs/*/game-template.ts:325`) todavía acepta `category` como campo opcional. Si se
quiere mostrar el género ahí, hay que resolverlo contra `game_genre` (una consulta más)
y agregarlo a la respuesta de carga del juego. No rompe este cambio.

### 8. Fixtures y tests

- `src/features/catalog/fixtures.ts`: 12 entradas con `category`. Cambiarlas a
  `genres: [...]` (varias pueden llevar más de uno, que es justamente el punto).
- `src/features/catalog/filters.spec.ts`: reescribir el bloque de `categoryFacets` para
  el nuevo contrato, incluido un caso de optimizador con dos géneros.
- `src/features/catalog/components/OptimizerCard.spec.tsx:17`: fixture del card.

## Lo que NO hay que tocar

- `template.category` en los paquetes `.zenith.json` y su esquema Zod: es formato del
  archivo del juego, no de la base. Sigue siendo válido (opcional) y `check-genres.mjs`
  no lo prohíbe.
- `demo/`: prototipo archivado, fuera del build.

## Nota sobre los privilegios por defecto

A partir de ahora, un objeto nuevo en `public` **no** es alcanzable por PostgREST hasta
que se le conceda algo. El propósito: antes nacía con
`INSERT/UPDATE/DELETE/TRUNCATE` para `anon`/`authenticated`, y `TRUNCATE` no pasa por
RLS.

Dos consecuencias para futuras migraciones:

1. Toda tabla o vista nueva necesita `grant` explícito.
2. **Las funciones no pueden cerrarse por defecto.** PostgreSQL tiene `EXECUTE` para
   `PUBLIC` incorporado de fábrica en una función; revocarlo por defecto no cambia
   nada (verificado). Cada `SECURITY DEFINER` nueva tiene que revocarse en su propia
   migración. Hay una prueba que falla si se olvida: en `rls.spec.ts`, "ninguna función
   SECURITY DEFINER queda ejecutable salvo las que las policies necesitan".
