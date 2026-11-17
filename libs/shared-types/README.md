# shared-types

**Contrato compartido** entre la UI y el motor. Define la forma de un juego, de un
inventario y de una petición de optimización, y las valida con Zod. Todo lo demás depende de
esto; por eso cambiar un esquema acá es un cambio de contrato, no un detalle interno.

## Por qué existe

El motor no sabe de qué juego se trata: recibe un `GameTemplate` y lo ejecuta. Ese desacople
solo funciona si existe una definición única —validada— de qué es una plantilla válida.

## Contenido

| Archivo | Qué define |
|---|---|
| `game-template.ts` | `GameTemplate`: estadísticas, ranuras, conjuntos, valores derivados, objetivos |
| `item.ts` | `Item`: la pieza que entra al solver |
| `skills.ts` | Selección y contribución de habilidades |
| `leveling.ts` | Curvas de nivel y ascensión |
| `solve.ts` | `SolveRequest` / resultado: entrada y salida del motor |
| `ids.ts` | Identificadores con reglas de normalización |
| `version.ts` | Versión del esquema — un contrato incompatible cambia de versión |
| `equipment.ts` | Equipo equipado |
| `database.types.ts` | Tipos generados desde el esquema de Supabase |
| `domain.ts` | Tipos de dominio derivados (`Profile`, `Optimizer`, `Vote`, `Subscription`) |

## Uso

```ts
import { GameTemplateSchema } from '@zenith/shared-types';

const result = GameTemplateSchema.safeParse(json);
if (!result.success) {
  // result.error describe exactamente qué campo no cumple el contrato
}
```

Para una validación completa —incluyendo referencias entre campos y coherencia con el
inventario— usá `validateTemplate` de `@zenith/core-engine`, que devuelve un reporte con los
problemas encontrados en lugar de una excepción.

**Validar en los dos lados.** Una plantilla creada por la comunidad se valida antes de
ejecutarse. Un JSON inválido da un error legible, no una excepción del motor en medio de la
búsqueda.

## Reglas del contrato

1. **Un esquema nuevo nace con versión.** `version.ts` permite rechazar plantillas de una
   versión que el motor no entiende.
2. **Los campos son explícitos.** Nada de `any` ni de "lo que sobre": un contrato laxo deja
   pasar datos que rompen el motor en runtime.
3. **Los tipos se derivan del esquema** (`z.infer`), no se escriben a mano. Dos fuentes de
   verdad divergen en la primera semana.

## Pruebas

```bash
npx nx test shared-types   # 11 pruebas, 2 archivos
```

## Tipo de cambio

Un cambio acá **no se divide en dos PRs**: el PR que modifica el esquema ajusta a sus
consumidores. Ver `CONTRIBUTING.md`.
