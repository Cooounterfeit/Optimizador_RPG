# Sprint 1 — Planning

**Fechas:** 5 al 18 de octubre de 2026
**Objetivo del sprint (registrado en Jira):** prototipo del Core Engine, PR #2 con el demo completo
y port del motor a `libs/core-engine`.

## Contexto de partida

El repositorio comienza con dos pull requests en la primera semana: el bootstrap del monorepo y un
prototipo funcional completo. El objetivo del sprint no fue construir la aplicación final, sino
demostrar que el motor de optimización funciona y dejar preparado el terreno para portarlo al
monorepo.

## Alcance comprometido

Trece historias de usuario, con un total de **35 puntos**:

| Épica | HU | Puntos |
|---|---|---|
| Configuración de juegos | CFG-05, CFG-06 | 6 |
| Autenticación | AUT-1, AUT-2 | 5 |
| Inventario | INV-8 | 5 |
| Técnica | TEC-10, TEC-12 | 6 |
| Investigación | SP-02 | 3 |
| Daño por golpe | DPG-01 a DPG-05 | 10 |

## Criterios de aceptación del sprint

- El motor expone funciones puras, sin dependencia de la interfaz ni de la red.
- Las pruebas unitarias validan casos conocidos y casos borde: inventario vacío, restricciones sin
  solución y múltiples objetivos.
- El monorepo compila y sirve la aplicación mediante `nx serve web`.

## Riesgos identificados al inicio

| Riesgo | Mitigación aplicada |
|---|---|
| El prototipo crece sin contrato de datos | `shared-types` con esquema Zod antes de portar el motor |
| El motor depende del prototipo | port con pruebas propias y no copia |
| Supabase sin definir | se investiga en paralelo (SP-02), sin bloquear el motor |

## Resultado

Se completaron 29 de 35 puntos, un **83 %**. El objetivo se cumplió: el motor quedó portado y
probado. Lo que no ingresó se trasladó al sprint siguiente, según se detalla en `backlog.md`.
