# Sprint 3 — Release

**Versión entregada:** tag `sprint-3`, sobre el commit `c98ce2c`, correspondiente al merge del PR
#10 (`feat/hoja-personaje-selector`).

El proyecto no utiliza versiones semánticas del tipo `v1.2.3`. Aplica una etiqueta por sprint, que
es lo que el listado de documentos solicita como entregable de Release. Se consulta en
`https://github.com/Cooounterfeit/Optimizer_RPG/releases/tag/sprint-3`.

## Qué ingresó a `main` en la ventana

Diecisiete commits en `main` entre el 2 y el 15 de noviembre, y 21 contando los de otras ramas. Los
hitos son los siguientes:

| Fecha | Commit | Contenido |
|---|---|---|
| 02 nov | `15e72c4` | persistencia local con Dexie (F3) |
| 03 nov | `020a31a` | `games` como caché; datos del jugador separados |
| 05 nov | `22f5d22` | shell y hub con el diseño V4 (F4) |
| 05 nov | `45e3a52` | hub real con Supabase, cuentas y perfil (F5) |
| 05 nov | `f8adce1` | CI de pruebas y build en GitHub Actions |
| 06 nov | `00d0072` | biografía en el perfil (AUT-3) |
| 07 nov | `ccb8488` | juego semilla e inventario (F6.1) |
| 07 nov | `6999e03` | catálogos, importación GOOD e imágenes (F6.2) |
| 08 nov | `0749470` | assets y catálogos fuera del código (F6.3) |
| 08 nov | `dea5ede` | reglas de juego en datos (F6.4) |
| 09 nov | `da98ffb` | optimizador, historial y habilidades (F7) |
| 11 nov | `f803d2f` | coherencia entre estadísticas mostradas y cálculo (6.1) |
| 11 nov | `d66d4f7` | límite de tiempo en segundos y clave de caché |
| 13 nov | `8bb6b71` | build actual equipable y panel de comparación (6.2) |
| 13 nov | `968d5c0` | hoja de personaje, nivel libre y selector (6.2b) |
| 13 nov | `c98ce2c` | PR #10 mergeado |

## Qué se puede demostrar con este incremento

1. **La aplicación funciona sin conexión.** Dexie guarda el perfil y el inventario, y el hub lee de
   Supabase cuando está configurado.
2. **Un optimizador real.** Devuelve una build equipable con objetos concretos y no un número.
   Ejecuta en un Web Worker con límite de tiempo.
3. **Comparativa triple.** Estadísticas actuales, históricas por nivel y proyectadas en una sola
   vista.
4. **Árbol de habilidades navegable**, con selección y cálculo de sinergias.
5. **Inventario completo:** agregar, ver, modificar, eliminar e importar.
6. **CI en cada pull request:** lint, tipos, pruebas y build.

## Qué no ingresó

Catorce historias y 56 puntos: la capa social (HUB-02, HUB-21 a HUB-23), la configuración avanzada
(CFG-03, CFG-04, CFG-13, CFG-14, CFG-16 y CFG-20), la exportación de inventario (INV-6) y cuatro
historias técnicas o de simulación que quedaron en revisión.

## Cómo verificarlo

```bash
npm ci
npx nx run-many -t lint,test,typecheck,build
npx nx e2e web-e2e -- --project=chromium
```

Sin Supabase configurado, la aplicación se inicia en modo local con Dexie. Con `VITE_USE_MOCKS=1`
utiliza los fixtures de las pruebas e2e.
