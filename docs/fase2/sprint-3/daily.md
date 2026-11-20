# Sprint 3 — Daily

Bitácora reconstruida desde las fechas de commit. No existió un daily escrito; se declara para no
presentar como acta lo que es una reconstrucción.

**Ventana:** 2 al 15 de noviembre de 2026.

## 2 de noviembre

- **Persistencia local.** Entra Dexie como capa de datos del navegador (`15e72c4`). El esquema
  local replica las tablas del remoto.
- Se ignoran todos los `.env` salvo `.env.example`: una credencial llegó a un commit y se cortó
  ahí.
- Se decide que `games` es **caché** y que los datos del jugador se borran aparte (`020a31a`).
  Mezclar ambos hacía que limpiar la caché borrara el inventario.

## 5 de noviembre

- **Shell y hub con el diseño V4** (`22f5d22`): navegación, layout y catálogo.
- **Hub real con Supabase** (`45e3a52`): cuentas, perfil y optimizadores publicados.
- **CI en GitHub Actions** (`f8adce1`): lint, tipos, pruebas y build por PR.

## 6 de noviembre

- Biografía en el perfil (`00d0072`), cierre de AUT-3.

## 7 y 8 de noviembre

- **F6.1** juego semilla e inventario (`ccb8488`).
- **F6.2** catálogos, importación GOOD e imágenes (`6999e03`).
- **F6.3** assets y catálogos fuera del código (`0749470`, `e007707`).
- **F6.4** reglas de juego en datos, no en el código (`dea5ede`, `48ff74e`).

## 9 de noviembre

- **F7 completa** (`da98ffb`): optimizador, historial de niveles y habilidades. Es el commit más
  grande del proyecto y cierra 50 puntos de una vez.

## 11 de noviembre

- Coherencia entre las estadísticas mostradas y el cálculo real (`f803d2f`).
- Límite de tiempo del optimizador en segundos y clave de caché por contenido real (`d66d4f7`).

## 13 de noviembre

- Build actual equipable y panel de comparación (`8bb6b71`).
- Hoja de personaje, nivel libre y selector en rejilla (`968d5c0`), mergeada por PR #10.
- Aviso único por curva sin uso, en vez de uno por perfil (`8827b9c`).

## Observación sobre la cadencia

Ocho de los diez días hábiles tienen al menos un commit, y dos de ellos (7 y 8 de noviembre) son
fin de semana. Es el sprint con más actividad registrada: 22 commits. Aun así el 60 % de los
puntos cayó en un solo día, porque el trabajo se integró por funcionalidad completa y no por
partes demostrables.
