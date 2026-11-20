# Sprint 4 — Review (en curso)

**Fecha:** 20 de noviembre de 2026, con el sprint abierto. Se completa al cierre.

## Objetivo del sprint

> Documentación, CI/CD, Docker y preparación de la demo final.

Estado: **cumplido en infraestructura y documentación; pendiente en producto.**

## Qué se demostró hasta ahora

### 1. Despliegue verificado, no supuesto

Producción corre con Supabase conectado, migrada a `us-west-2` con session pooler (`17292d2`).
Antes de esto, el despliegue estaba documentado como «no verificado» (`315df43`): se corrigió el
documento para que dijera la verdad y después se verificó.

### 2. Docker construye y sirve la aplicación

`96b6752`. Sirve para verificar el build fuera de Vercel, que es donde aparecen los problemas de
rutas y assets.

### 3. CI completa

`8b3af7f` y `dca27b8`: validación solo de lo afectado, auditoría de dependencias, Sonar con
cobertura real y corrección de los tres hallazgos de la quality gate.

### 4. El editor empieza a existir

`5c4cbe7` implementa crear un optimizador desde cero (CFG-05). Es la primera de las once HUs de
configuración, y la que destraba las demás.

## Qué falta para cerrar

| Bloque | HUs | Puntos |
|---|---|---|
| Editor de juegos | CFG-01, 02, 03, 04, 05, 06, 07, 08, 09A, 09B, 11 | 42 |
| Cierre de la demo | TEC-22, TEC-23, UI-01, CFG-21 | 20 |
| Comunidad | HUB-02, HUB-21, HUB-22, HUB-23, HUB-34 | 17 |
| Suscripciones | SUB-32, SUB-36, SUB-37, SUB-38 | 16 |

## Métricas al 20 de noviembre

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 162 |
| Puntos completados | 3 (SP-01, del sprint de arranque) |
| HUs en curso | 7 |
| HUs en revisión | 4 |
| Días hábiles transcurridos | 5 de 10 |

## Observación

La review de este sprint no puede juzgar el objetivo todavía: la documentación y la infraestructura
están hechas, y el producto —el editor— está a mitad de camino. Lo que sí se puede juzgar es la
decisión de haber puesto **todo el pendiente en el sprint abierto**: hace visible el hueco, pero
también infla el compromiso a 162 puntos que no se van a cerrar.
