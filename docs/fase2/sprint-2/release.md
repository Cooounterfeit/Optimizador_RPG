# Sprint 2 — Release

**Versión entregada:** tag `sprint-2`, sobre el commit `17044c6`
(`feat(supabase): esquema en el repo y pruebas RLS con PGlite`).

El proyecto no usa versiones semánticas (`v1.2.3`): usa una etiqueta por sprint, que es lo que el
listado de documentos pide como entregable de Release. Se ve en
`https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-2`.

## Qué entró a `main` en la ventana

| Fecha | Commit | Contenido |
|---|---|---|
| 19 oct | `f091809` | Merge de evidencias de Fase 2 y configuración de la demo |
| 19 oct | `995b63c` | Prueba e2e ajustada al nuevo nombre del producto |
| 25 oct | `f2ce2c9` | Dependencia del motor registrada en el lockfile |
| 25 oct | `ef90e7b` | PR #3 mergeado |
| 01 nov | `e07db01` | Tipos de dominio generados desde Supabase |
| 01 nov | `acfd547` | Casos borde del motor (TEC-12) |
| 01 nov | `17044c6` | Esquema versionado y pruebas RLS con PGlite |

## Qué se puede demostrar con este incremento

1. **Un clon limpio instala y compila.** El fallo de lockfile está corregido; el build desde cero
   ya no depende de un `node_modules` previo.
2. **El esquema es reproducible.** `supabase/migrations/` aplica desde una base vacía y crea
   perfiles, suscripciones, optimizadores, votos, favoritos, reportes e inventario en la nube.
3. **Las políticas RLS están probadas.** No es una afirmación del documento: hay una prueba que
   falla si una política deja de proteger una fila.
4. **Las fórmulas de daño se pueden verificar contra valores concretos.** Para el caso de la
   prueba: ataque 50, daño base 100, crítico +50 %, probabilidad 50 %, defensa 20 →
   promedio 167,5 · sin crítico 130 · con crítico 205.

## Qué no entró

| HU | Puntos | Motivo |
|---|---|---|
| HUB-34 | 3 | El aspecto visual del optimizador depende del editor, posterior |
| CFG-02 | 2 | El listado de atributos requiere el editor de variables |

Ambas quedaron en Jira arrastradas al Sprint 4 durante el ordenamiento del 20 de noviembre.

## Cómo verificarlo

```bash
npm ci
npx nx run-many -t build,test
```

La prueba de RLS vive en `supabase/tests/rls.spec.ts` y entra en el target `test`, así que corre
con el resto. No necesita credenciales de Supabase: levanta Postgres embebido con PGlite.
