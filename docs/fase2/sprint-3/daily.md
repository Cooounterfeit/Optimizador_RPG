# Sprint 3 — Daily

Bitácora reconstruida desde las fechas de commit. No existió un daily escrito, y se declara para no
presentar como acta lo que constituye una reconstrucción.

**Ventana:** 2 al 15 de noviembre de 2026.

## 2 de noviembre

- **Persistencia local.** Ingresa Dexie como capa de datos del navegador (`15e72c4`). El esquema
  local replica las tablas del remoto.
- Se excluyen todos los archivos `.env` salvo `.env.example`. Una credencial había llegado a un
  commit y la exposición se detuvo allí.
- Se decide que `games` funcione como **caché** y que los datos del jugador se eliminen mediante
  una operación distinta (`020a31a`). Mezclar ambos borrados hacía que limpiar la caché eliminara
  el inventario.

## 5 de noviembre

- **Shell y hub con el diseño V4** (`22f5d22`): navegación, layout y catálogo.
- **Hub real con Supabase** (`45e3a52`): cuentas, perfil y optimizadores publicados.
- **CI en GitHub Actions** (`f8adce1`): lint, tipos, pruebas y build por pull request.

## 6 de noviembre

- Biografía en el perfil (`00d0072`), con lo que se cierra AUT-3.

## 7 y 8 de noviembre

- **F6.1**, juego semilla e inventario (`ccb8488`).
- **F6.2**, catálogos, importación GOOD e imágenes (`6999e03`).
- **F6.3**, assets y catálogos fuera del código (`0749470`, `e007707`).
- **F6.4**, reglas de juego en datos y no en el código (`dea5ede`, `48ff74e`).

## 9 de noviembre

- **F7 completa** (`da98ffb`): optimizador, historial de niveles y habilidades. Es el commit más
  extenso del proyecto y cierra 50 puntos de una vez.

## 11 de noviembre

- Coherencia entre las estadísticas mostradas y el cálculo real (`f803d2f`).
- Límite de tiempo del optimizador en segundos y clave de caché por contenido real (`d66d4f7`).

## 13 de noviembre

- Build actual equipable y panel de comparación (`8bb6b71`).
- Hoja de personaje, nivel libre y selector en rejilla (`968d5c0`), mergeada mediante el PR #10.
- Aviso único por curva sin uso, en lugar de uno por perfil (`8827b9c`).

## Observación sobre la cadencia

Siete de los diez días hábiles tienen al menos un commit. A ellos se suman el sábado 7 y el domingo
8 de noviembre. Son **17 commits en `main`**, 16 sin contar el merge del PR #10, y representan el
sprint con más actividad registrada.
