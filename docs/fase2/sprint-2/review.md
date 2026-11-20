# Sprint 2 — Review

**Fecha:** 1 de noviembre de 2026
**Incremento demostrado:** catálogo con identidad visual, esquema versionado y fórmulas de daño.

## Objetivo del sprint

> Rediseño visual, catálogo con portadas y esquema Supabase en el repo con pruebas RLS.

**Cumplido.** Los tres frentes se entregaron; el rediseño visual quedó parcial (HUB-34 se
arrastró).

## Qué se demostró

### 1. El esquema de datos vive en el repositorio

```bash
dir supabase/migrations
 20261005000001_esquema_inicial.sql
 20261005000002_avatares.sql
 20261005000003_optimizer_cards.sql
```

Antes las tablas se creaban desde el panel de Supabase: el esquema existía en un lugar que nadie
podía versionar. Ahora se aplica desde cero y el resultado es reproducible.

Tablas: `profiles`, `subscriptions`, `app_settings`, `optimizers`, `votes`, `favorites`,
`reports`, `cloud_inventory`.

### 2. Las políticas RLS se prueban, no se confían

`supabase/tests/rls.spec.ts` levanta Postgres embebido (PGlite) y verifica las políticas sobre
roles reales. Una política que deje de proteger una fila rompe la suite.

Esto es lo más importante del sprint y lo que menos se ve en el tablero: **un punto que no se
puede comprobar no está protegido, está supuesto.**

### 3. Las tres fórmulas de daño dan el mismo número que la calculadora

Caso de la prueba e2e (`apps/web-e2e/src/damage.spec.ts`), ataque 50, daño base 100, crítico
+50 %, probabilidad 50 %, defensa 20:

| Fórmula | HU | Resultado |
|---|---|---|
| Daño promedio por golpe | DPG-06 | 167,5 |
| Daño de golpe con solo crítico | DPG-07 | 205 |
| Daño por golpe sin crítico | DPG-08 | 130 |

La prueba falla si alguno de los tres números cambia, lo que convierte las fórmulas en contrato.

### 4. El catálogo no inventa datos

`catalog-repository.ts` define tres modos explícitos: Supabase si está configurado, fixtures solo
en modo mock/e2e, y **catálogo vacío** en cualquier otro caso. Un catálogo que muestra datos de
ejemplo sin decirlo es una mentira cómoda; este elige quedarse vacío.

## Qué no se demostró

| HU | Puntos | Motivo | Destino |
|---|---|---|---|
| HUB-34 | 3 | Depende del editor de optimizadores, que llega después | Sprint 4 |
| CFG-02 | 2 | Necesita el editor de variables | Sprint 4 |

## Métricas

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 32 |
| Puntos completados | 27 |
| Cumplimiento | **84 %** |
| HUs cerradas | 7 de 9 |
| Commits en la ventana | 7 |
| PRs mergeados | 1 (#3) |

## Observaciones de la review

1. **El tablero miente por omisión.** Sin estados intermedios, un sprint que avanzó mucho parece
   detenido. Se acuerda usar «En curso» desde el sprint siguiente.
2. **La entrega se concentra al final.** 27 de 32 puntos cierran el último día. Es el patrón que
   la retrospectiva ataca.
3. **La deuda visible es el editor.** Tres HUs —HUB-34, CFG-02 y las de configuración— dependen
   de que exista, y el editor no está en este sprint.
