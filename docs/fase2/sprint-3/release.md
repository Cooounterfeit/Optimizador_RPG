# Sprint 3 — Release

**Versión entregada:** tag `sprint-3`, sobre el commit `c98ce2c` (merge del PR #10,
`feat/hoja-personaje-selector`).

El proyecto no usa versiones semánticas (`v1.2.3`): usa una etiqueta por sprint, que es lo que el
listado de documentos pide como entregable de Release. Se ve en
`https://github.com/Cooounterfeit/Optimizador_RPG/releases/tag/sprint-3`.

## Qué entró a `main` en la ventana

17 commits en `main` entre el 2 y el 15 de noviembre (21 contando los de otras ramas). Los hitos:

| Fecha | Commit | Contenido |
|---|---|---|
| 02 nov | `15e72c4` | Persistencia local con Dexie (F3) |
| 03 nov | `020a31a` | `games` como caché; datos del jugador separados |
| 05 nov | `22f5d22` | Shell y hub con el diseño V4 (F4) |
| 05 nov | `45e3a52` | Hub real con Supabase, cuentas y perfil (F5) |
| 05 nov | `f8adce1` | CI de pruebas y build en GitHub Actions |
| 06 nov | `00d0072` | Biografía en el perfil (AUT-3) |
| 07 nov | `ccb8488` | Juego semilla e inventario (F6.1) |
| 07 nov | `6999e03` | Catálogos, importación GOOD e imágenes (F6.2) |
| 08 nov | `0749470` | Assets y catálogos fuera del código (F6.3) |
| 08 nov | `dea5ede` | Reglas de juego en datos (F6.4) |
| 09 nov | `da98ffb` | Optimizador, historial y habilidades (F7) |
| 11 nov | `f803d2f` | Coherencia entre stats mostradas y cálculo (6.1) |
| 11 nov | `d66d4f7` | Límite de tiempo en segundos y clave de caché |
| 13 nov | `8bb6b71` | Build actual equipable y panel de comparación (6.2) |
| 13 nov | `968d5c0` | Hoja de personaje, nivel libre y selector (6.2b) |
| 13 nov | `c98ce2c` | PR #10 mergeado |

## Qué se puede demostrar con este incremento

1. **La aplicación funciona sin conexión.** Dexie guarda el perfil y el inventario; el hub lee de
   Supabase cuando está configurado.
2. **Un optimizador real.** Devuelve una build equipable con objetos concretos, no un número.
   Corre en un Web Worker con límite de tiempo.
3. **Comparativa triple.** Estadísticas actuales, históricas por nivel y proyectadas, en una vista.
4. **Árbol de habilidades navegable** con selección y cálculo de sinergias.
5. **Inventario completo**: agregar, ver, modificar, eliminar e importar.
6. **CI en cada PR**: lint, tipos, pruebas y build.

## Qué no entró

14 HUs, 56 puntos: la capa social (HUB-02, HUB-21 a HUB-23), la configuración avanzada
(CFG-03/04/13/14/16/20), la exportación de inventario (INV-6) y cuatro HUs técnicas o de
simulación que quedaron en revisión.

## Cómo verificarlo

```bash
npm ci
npx nx run-many -t lint,test,typecheck,build
npx nx e2e web-e2e -- --project=chromium
```

Sin Supabase configurado la aplicación arranca en modo local (Dexie). Con `VITE_USE_MOCKS=1` usa
los fixtures de las pruebas e2e.
