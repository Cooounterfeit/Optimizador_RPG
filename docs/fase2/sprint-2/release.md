# Sprint 2 — Release

**Versión entregada:** tag `sprint-2`, sobre el commit `17044c6`
(`feat(supabase): esquema en el repo y pruebas RLS con PGlite`).

El proyecto no utiliza versiones semánticas del tipo `v1.2.3`. Aplica una etiqueta por sprint, que
es lo que el listado de documentos solicita como entregable de Release. Se consulta en
`https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-2`.

## Qué ingresó a `main` en la ventana

| Fecha | Commit | Contenido |
|---|---|---|
| 19 oct | `f091809` | merge de evidencias de Fase 2 y configuración de la demo |
| 19 oct | `995b63c` | prueba e2e ajustada al nuevo nombre del producto |
| 25 oct | `f2ce2c9` | dependencia del motor registrada en el lockfile |
| 25 oct | `ef90e7b` | PR #3 mergeado |
| 01 nov | `e07db01` | tipos de dominio generados desde Supabase |
| 01 nov | `acfd547` | casos borde del motor (TEC-12) |
| 01 nov | `17044c6` | esquema versionado y pruebas RLS con PGlite |

## Qué se puede demostrar con este incremento

1. **Un clon limpio instala y compila.** El fallo de lockfile está corregido, y el build desde cero
   ya no depende de un `node_modules` previo.
2. **El esquema es reproducible.** `supabase/migrations/` se aplica desde una base vacía y crea
   perfiles, suscripciones, optimizadores, votos, favoritos, reportes e inventario en la nube.
3. **Las políticas RLS están probadas.** No se trata de una afirmación del documento: existe una
   prueba que falla si una política deja de proteger una fila.
4. **Las fórmulas de daño se verifican contra valores concretos.** Para el caso de la prueba, con
   ataque 50, daño base 100, crítico de +50 %, probabilidad 50 % y defensa 20, los resultados son
   promedio 167,5, sin crítico 130 y con crítico 205.

## Qué no ingresó

| HU | Puntos | Motivo |
|---|---|---|
| HUB-34 | 3 | el aspecto visual del optimizador depende del editor, que llega después |
| CFG-02 | 2 | el listado de atributos requiere el editor de variables |

Ambas quedaron en Jira, arrastradas al Sprint 4 durante el ordenamiento del 20 de noviembre.

## Cómo verificarlo

```bash
npm ci
npx nx run-many -t build,test
```

La prueba de RLS reside en `supabase/tests/rls.spec.ts` y forma parte del target `test`, por lo que
se ejecuta con el resto. No necesita credenciales de Supabase, porque levanta Postgres embebido con
PGlite.
