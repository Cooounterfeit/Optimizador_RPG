# Sprint 4 — Review

**Fecha:** 20 de noviembre de 2026, con el sprint abierto. Cierra el 23 a medianoche.

## Objetivo del sprint

> Documentación, CI/CD, Docker y preparación de la demo final.

Estado: cumplido en infraestructura y documentación, y pendiente en producto.

## Qué se demostró

### 1. Despliegue verificado y no supuesto

Producción ejecuta con Supabase conectado, migrada a `us-west-2` con session pooler (`17292d2`).
Antes de esto, el despliegue estaba documentado como «no verificado» (`315df43`). Se corrigió el
documento para que declarara la verdad y después se verificó.

### 2. Docker construye y sirve la aplicación

Commit `96b6752`. Permite verificar el build fuera de Vercel, que es donde aparecen los problemas de
rutas y assets.

### 3. CI completa

Commits `8b3af7f` y `dca27b8`: validación solo de lo afectado, auditoría de dependencias, Sonar con
cobertura real y corrección de los tres hallazgos de la quality gate.

### 4. El editor comienza a existir

Commit `17d444e`, que implementa crear un optimizador desde cero (CFG-05). Es la primera de las once
historias de configuración y la que desbloquea las demás.

## Qué falta para el cierre

| Bloque | HUs | Puntos |
|---|---|---|
| Editor de juegos | CFG-01, 02, 03, 04, 05, 06, 07, 08, 09A, 09B, 11 | 42 |
| Cierre de la entrega | TEC-23, UI-01, CFG-21 | 15 |
| Comunidad | HUB-02, HUB-21, HUB-22, HUB-23, HUB-34 | 17 |
| Suscripciones | SUB-32, SUB-36, SUB-37, SUB-38 | 16 |

TEC-22 no figura. La demo se conserva como evidencia hasta el fin de la asignatura, por lo que su
eliminación no constituye un pendiente de la entrega.

## Métricas al 20 de noviembre

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 162 |
| Puntos completados | 3 (SP-01, del sprint de arranque) |
| HUs en curso | 7 |
| HUs en revisión | 4 |
| Días hábiles transcurridos | 5 de 6 |

## Observación

La review de este sprint no puede juzgar el objetivo todavía. La documentación y la infraestructura
están hechas, y el producto, es decir el editor, está a mitad de camino. Lo que sí puede juzgarse es
la decisión de haber puesto todo el pendiente en el sprint abierto. Hace visible el hueco y, al
mismo tiempo, eleva el compromiso a 162 puntos que no se cerrarán.

## Verificación al cierre, 23 de noviembre

Las métricas de la tabla corresponden a la foto de Jira del 20. Lo que el repositorio permite
confirmar al cierre es el estado del producto, y resulta mejor de lo que esa foto sugería. Existen
CFG-05 completo (`17d444e`, `013e8b3`), CFG-06 (`6cff5b7`) y CFG-01 (`cec1a57`), además del cockpit
6.3.5 (`896debf`, `3bd3e2a`) y el presupuesto de habilidades por nivel (`6f6d839`).

La suite completa pasa al cierre con **182 casos del motor, 317 de la interfaz, 89 de base de datos,
72 de persistencia, 29 de inventario y 11 del contrato**, más 27 recorridos de extremo a extremo.
Los cinco casos del motor que fallaban en el checkout de Windows eran de portabilidad, porque el
repositorio guarda tres fixtures como enlaces simbólicos. Quedaron corregidos en el lector de
fixtures y no se silenciaron.

Lo que permanece abierto al cierre es el editor completo de variables y la exportación de
inventario. La presentación del 24 no los requiere, porque muestra lo que existe.
