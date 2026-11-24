# Sprint 3 — Review

**Fecha:** 15 de noviembre de 2026
**Incremento demostrado:** la aplicación real, con inventario, simulación y hoja de personaje.

## Objetivo del sprint

> Dexie, hub con Supabase, cuentas, F6.1 a F6.4, F7 y la hoja de personaje.

**Cumplido en lo esencial.** Todo lo que el objetivo enumera se entregó. Lo que no ingresó fue
alcance añadido durante el sprint, correspondiente a comunidad y configuración avanzada, y no lo
comprometido.

## Qué se demostró

### 1. Persistencia local con Dexie, separada de la caché

El jugador puede utilizar la aplicación sin conexión. La distinción relevante es que `games` se
puede refrescar sin afectar el inventario. Antes, refrescar eliminaba datos del usuario
(`020a31a`).

### 2. El hub con Supabase y cuentas reales

Registro, inicio de sesión, perfil y optimizadores publicados leídos desde Supabase (`45e3a52`).
Las políticas RLS del Sprint 2 impiden que un usuario edite el optimizador de otro. Se probaron en
el sprint anterior y se utilizan en este.

### 3. El optimizador devuelve una build y no un número

`libs/core-engine/src/lib/optimizer.ts` recorre las combinaciones de objetos compatibles y devuelve
la mejor build equipable. Se ejecuta en `optimizer.worker.ts` con límite de tiempo en segundos
(`d66d4f7`), de modo que la interfaz no se congela.

### 4. Comparativa triple en una vista

Actual, histórica por nivel y proyectada, en `BuildComparison.tsx`, con el historial de niveles en
`LevelHistoryPanel.tsx`. Es la funcionalidad que vuelve útil al simulador, porque sin comparación
un número no aporta información.

### 5. Árbol de habilidades navegable

`SkillTreeCanvas.tsx` dibuja el grafo y `libs/core-engine/skills.ts` calcula sinergias. El catálogo
de habilidades y la selección se resuelven sobre datos y no sobre constantes.

### 6. Inventario completo

Agregar, ver, modificar, eliminar e importar (`features/inventory`). La importación utiliza el
formato GOOD, que es el que emplean las herramientas existentes del nicho.

## Qué no se demostró

| Bloque | HUs | Puntos | Motivo |
|---|---|---|---|
| Comunidad | HUB-02, HUB-21, HUB-22, HUB-23 | 14 | depende de la capa social, posterior a la entrega |
| Configuración avanzada | CFG-03, CFG-04, CFG-13, CFG-14, CFG-16, CFG-20 | 26 | depende del editor de juegos |
| Exportación | INV-6 | 3 | simétrica a la importación y no bloqueaba |
| En revisión | SIM-02, TEC-01, TEC-03 | 13 | trabajo hecho, verificación pendiente |
| **Total** | **14 HUs** | **56** | |

## Métricas

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 182 |
| Puntos completados | 126 |
| Cumplimiento | **69 %** |
| HUs cerradas | 25 de 39 |
| Commits en la ventana | 22 |
| PRs mergeados | 1 (#10) |

## Observaciones de la review

1. **Se entregó más que nunca y el porcentaje descendió.** Fueron 126 puntos en diez días, frente a
   27 del sprint anterior. El indicador que falló fue el compromiso y no la entrega.
2. **El estado «En revisión» funcionó, pero solo al final.** Cuatro historias permanecieron allí
   porque la verificación se dejó para el último día.
3. **La capa social no constituye un olvido.** Sin editor de juegos, publicar y votar optimizadores
   carece de sentido. Se decide no forzarla y arrastrarla.
