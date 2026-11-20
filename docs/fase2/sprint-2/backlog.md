# Sprint 2 — Backlog

Estado al cierre, 1 de noviembre de 2026. Fuente: Jira, proyecto `ZO`, sprint 6
("Sprint 2 — Catálogo y RLS"), consultado por API el 20 de noviembre de 2026.

| HU | Título | Pts | Estado | Evidencia |
|---|---|---|---|---|
| ZO-17 · CFG-10 | Definir restricciones sobre las variables | 5 | Listo | `libs/shared-types/src/lib/solve.ts` — `ConstraintSchema` con Zod |
| ZO-23 · HUB-01 | Listado de optimizadores comunitarios con reconocimiento visual | 5 | Listo | `features/catalog/HomePage.tsx`, `monogram.ts`, `accent.ts`, `filters.ts` |
| ZO-45 · INV-1 | Crear el catálogo de un juego | 5 | Listo | `features/catalog/catalog-repository.ts` + `supabase-catalog-repository.ts` |
| ZO-46 · INV-2 | Ver el catálogo de ítems | 3 | Listo | `features/catalog/types.ts`, `CatalogGrid` sobre `builtin-games.ts` |
| ZO-84 · DPG-06 | Fórmula de daño promedio por golpe | 3 | Listo | `apps/web-e2e/src/damage.spec.ts` — espera 167,5 |
| ZO-85 · DPG-07 | Fórmula de daño de golpe con solo crítico | 3 | Listo | idem — espera 205 |
| ZO-86 · DPG-08 | Fórmula de daño por golpe sin crítico | 3 | Listo | idem — espera 130 |
| ZO-40 · HUB-34 | Personalizar el aspecto visual de un optimizador | 3 | Por hacer | Arrastrada al Sprint 4 |
| ZO-72 · CFG-02 | Ver el listado de atributos base de un juego | 2 | Por hacer | Arrastrada al Sprint 4 |

## Resumen

| Estado | HUs | Puntos |
|---|---|---|
| Listo | 7 | 27 |
| En curso | 0 | 0 |
| Por hacer | 2 | 5 |
| **Comprometido** | **9** | **32** |

Cumplimiento: **27 / 32 = 84 %**.

## Desfase entre cierre en Jira y código

Las siete HUs cerradas tienen su evidencia en `apps/web`, y esa evidencia es de noviembre:

```
2026-11-05  feat(web): shell y hub de optimizadores con el diseno V4 (F4)
2026-11-05  feat(web): hub real con Supabase, cuentas y perfil (F5)
2026-11-08  feat(web): assets y catalogos fuera del codigo (F6.3)
2026-11-09  feat(simulation): cerrar F7 con optimizador, historial y habilidades
```

El sprint cerró el 1 de noviembre. Es decir: **la HU estaba marcada Listo antes de que su código
estuviera en el monorepo**. No se corrige el estado porque Jira es la fuente operativa y el
equipo cerró esas HUs con el prototipo como referencia; lo que se corrige es la afirmación de
que código y estado ocurrieron a la vez. Se deja constancia aquí y no se repite en cada
documento.

Esto explica también por qué el conteo de commits del sprint es bajo: en esas dos semanas se
tomaron decisiones y se escribió el esquema, no la interfaz.

## Nota sobre el alcance

**Las tres fórmulas de daño (DPG-06, DPG-07 y DPG-08) se cerraron juntas.** Comparten entradas
—ataque, daño base, probabilidad y multiplicador de crítico, defensa del objetivo— y difieren
solo en el caso de crítico. Separarlas en tres entregas habría triplicado la misma prueba.
