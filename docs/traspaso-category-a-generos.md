# Traspaso: de `category` a géneros del catálogo

Estado: **base de datos aplicada en local, staging y producción**. Falta adaptar `apps/web`.
Este documento está dirigido a quien realice ese cambio. **No requiere modificar `supabase/`**.

> **El listado del hub está roto en producción.** La vista `optimizer_cards` ya no expone
> `category`, y la aplicación desplegada la sigue solicitando. PostgREST responde `400` y el
> listado queda vacío. La corrección se detalla en la sección
> [Qué hay que cambiar en `apps/web`](#qué-hay-que-cambiar-en-appsweb).

## Qué cambió en la base de datos

Nueve migraciones en total, todas append-only:

| Migración | Qué modifica |
|---|---|
| `20261122000001_integridad_rendimiento.sql` | Auditoría de `reports`, recálculo del puntaje por sentencia, `cover` como columna generada e índices faltantes. |
| `20261123000001_catalogo_juegos.sql` | Crea el catálogo normalizado: `game`, `genre`, `game_genre` (M:N) y `game_alias`, además de `optimizers.game_id`. |
| `20261124000001_unificar_juego.sql` | Enlaza cada optimizador a un juego del catálogo y elimina `optimizers.game_name`. La vista resuelve el nombre mediante un join. |
| `20261125000001_privilegios_por_defecto.sql` | Los objetos nuevos en `public` dejan de crearse con permisos para `anon` y `authenticated`. |
| `20261125000002_vista_con_generos.sql` | `optimizer_cards` expone `game_id` y `genres text[]`. Desaparece `optimizers.category`. |
| `20261125000003_gifts_y_stripe_events.sql` | Crea `subscription_gifts` y `stripe_events`. |

Además, se recuperaron los géneros que residían en `category`. `Genshin Impact` pasó a `Action RPG` y `Gacha`, y `RPG clasico` pasó a `RPG`. `Astral Forge` tenía `category` vacía y
permanece sin géneros, igual que antes.

## Forma nueva de `optimizer_cards`

```
id, name, description, game_id, game_name, genres, cover, score,
votes_count, created_at, author_id, author_name, author_avatar
```

`genres` es `text[]` en todos los casos. Devuelve un arreglo vacío si el juego no tiene géneros,
nunca `NULL`. El `order by` del `array_agg` garantiza el orden alfabético.

## Justificación

`category` era una columna generada desde `template->>'category'`, texto libre que el autor
escribía en el archivo `.zenith.json`. Esto permitía que el mismo juego apareciera como `ARPG` en
una build y como `Action RPG` en otra. El hub tenía ambas formas en sus fixtures.

El catálogo normalizado `game` + `genre` + `game_genre` es M:N. Un juego puede tener varios
géneros y el vocabulario queda en un solo lugar. Además, `category` nunca fue un dato del
optimizador: es una propiedad del juego.

## Qué hay que cambiar en `apps/web`

La aplicación compila y sus pruebas pasan porque utilizan fixtures y no la base de datos. El fallo
aparece en tiempo de ejecución: la consulta solicita `category`, que ya no existe, y PostgREST
responde `400`.

### 1. `src/lib/database.types.ts`

En `OptimizerCardRow` (líneas 28-43): eliminar `category` y agregar

```ts
game_id: string;
genres: string[];
```

### 2. `src/features/catalog/supabase-catalog-repository.ts`

En `COLUMNS` (líneas 6-19): reemplazar `'category'` por `'game_id'` y `'genres'`.

En `mapCard` (línea 24): reemplazar `category: row.category ?? undefined` por
`genres: row.genres`.

### 3. `src/features/catalog/types.ts`

Reemplazar `CatalogOptimizer.category?: string` por `genres: string[]`. El campo pasa a ser
obligatorio porque la vista siempre devuelve un arreglo. Conviene agregar `gameId: string` para
que el hub pueda agrupar por juego.

### 4. `src/features/catalog/filters.ts`

El filtro deja de ser una categoría por optimizador y pasa a ser un género. Existen dos
diferencias de comportamiento que requieren una decisión explícita:

- **Un optimizador puede pertenecer a varios géneros.** `categoryFacets` debe contar cada género
  del arreglo, no uno solo.
- `UNCATEGORIZED` agrupa actualmente los optimizadores sin categoría. Con géneros, el equivalente
  es el arreglo vacío. Se conserva o se elimina, pero el filtro no debe comparar contra
  `undefined`.

Firma sugerida: `CatalogFilterState.category` pasa a `genre: string`. En `filterOptimizers`:

```ts
state.genre === 'all' || optimizer.genres.includes(state.genre)
```

### 5. `src/features/catalog/components/FilterRail.tsx`

Renombrar `CategoryFacet` y `onCategory` a `GenreFacet` y `onGenre`, y `state.category` a
`state.genre`. El título del panel ya dice `Genres` (`copy.ts:18`). Solo el código conserva el
nombre anterior.

### 6. `src/features/catalog/components/OptimizerCard.tsx:36-40`

La etiqueta de la esquina muestra `optimizer.category`. Con `genres` hay que elegir uno (el
primero, o los dos primeros). Es una decisión de diseño y no de datos.

### 7. `src/features/optimizer/OverviewPage.tsx:42-46`

Muestra `template.category` del juego abierto. **Esto no depende de la base de datos.** `template`
proviene del archivo `.zenith.json`, y el esquema del paquete
(`libs/*/game-template.ts:325`) todavía acepta `category` como campo opcional. Para mostrar el género en ese punto hay que resolverlo contra `game_genre`. Esto implica una consulta adicional y ampliar la respuesta de carga del juego. No bloquea este cambio.

### 8. Fixtures y pruebas

- `src/features/catalog/fixtures.ts`: 12 entradas con `category`. Cambiarlas a `genres: [...]`.
  Varias pueden llevar más de un género, que es precisamente el objetivo del cambio.
- `src/features/catalog/filters.spec.ts`: reescribir el bloque de `categoryFacets` para el nuevo
  contrato, incluido un caso de optimizador con dos géneros.
- `src/features/catalog/components/OptimizerCard.spec.tsx:17`: fixture del card.

## Lo que no se debe modificar

- `template.category` en los paquetes `.zenith.json` y su esquema Zod. Es formato del archivo del
  juego y no de la base. Sigue siendo válido como opcional, y `check-genres.mjs` no lo prohíbe.
- `demo/`: prototipo archivado, fuera del build.

## Nota sobre los privilegios por defecto

A partir de la migración correspondiente, un objeto nuevo en `public` no resulta alcanzable por PostgREST. Requiere un permiso explícito.

El motivo es concreto: antes, todo objeto nacía con `INSERT`, `UPDATE`, `DELETE` y `TRUNCATE`
para `anon` y `authenticated`. `TRUNCATE` no pasa por RLS, de modo que cualquier usuario
autenticado podía vaciar una tabla nueva.

Esto produce dos consecuencias para las migraciones futuras:

1. Toda tabla o vista nueva requiere un `grant` explícito.
2. **Las funciones no pueden cerrarse por defecto.** PostgreSQL incorpora `EXECUTE` para `PUBLIC`
   en el valor por defecto de una función. Revocarlo por defecto no cambia el resultado, según se
   verificó. Cada función `SECURITY DEFINER` nueva debe revocarse en su propia migración. Una
   prueba detecta el olvido: en `rls.spec.ts`, «ninguna función SECURITY DEFINER queda ejecutable
   salvo las que las policies necesitan».
