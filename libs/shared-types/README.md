# shared-types

Contrato compartido entre la interfaz y el motor. Define la forma de un juego, de un inventario y
de una petición de optimización, y las valida con Zod. Todo lo demás depende de esta librería. Por
esta razón, modificar un esquema constituye un cambio de contrato y no un detalle interno.

## Propósito

El motor no conoce el juego que procesa: recibe un `GameTemplate` y lo ejecuta. Ese desacople solo
funciona si existe una definición única y validada de qué constituye una plantilla válida.

## Contenido

| Archivo | Qué define |
|---|---|
| `game-template.ts` | `GameTemplate`: estadísticas, ranuras, conjuntos, valores derivados y objetivos |
| `item.ts` | `Item`: la pieza que ingresa al solver |
| `skills.ts` | selección y contribución de habilidades |
| `leveling.ts` | curvas de nivel y ascensión |
| `solve.ts` | `SolveRequest` y resultado: entrada y salida del motor |
| `ids.ts` | identificadores con reglas de normalización |
| `version.ts` | versión del esquema; un contrato incompatible cambia de versión |
| `equipment.ts` | equipo equipado |
| `database.types.ts` | tipos generados desde el esquema de Supabase |
| `domain.ts` | tipos de dominio derivados (`Profile`, `Optimizer`, `Vote`, `Subscription`) |

## Ejemplo de uso

```ts
import { GameTemplateSchema } from '@zenith/shared-types';

const result = GameTemplateSchema.safeParse(json);
if (!result.success) {
  // result.error describe exactamente qué campo no cumple el contrato
}
```

Para una validación completa, que incluye referencias entre campos y coherencia con el inventario,
utilice `validateTemplate` de `@zenith/core-engine`. Devuelve un reporte con los problemas
encontrados en lugar de lanzar una excepción.

**Validación en ambos extremos.** Una plantilla creada por la comunidad se valida antes de
ejecutarse. Un JSON inválido produce un error legible y no una excepción del motor durante la
búsqueda.

## Reglas del contrato

1. **Todo esquema nuevo lleva versión.** `version.ts` permite rechazar plantillas de una versión
   que el motor no admite.
2. **Los campos son explícitos.** No se usa `any` ni se admite contenido libre. Un contrato laxo
   deja pasar datos que rompen el motor en tiempo de ejecución.
3. **Los tipos se derivan del esquema** mediante `z.infer` y no se escriben manualmente. Dos fuentes
   de verdad divergen en la primera semana.

## Pruebas

```bash
npx nx test shared-types
```

Son 11 pruebas en 2 archivos.

## Alcance de los cambios

Una modificación en esta librería no se divide en dos pull requests. El pull request que modifica
el esquema ajusta también a sus consumidores. Consulte `CONTRIBUTING.md`.
