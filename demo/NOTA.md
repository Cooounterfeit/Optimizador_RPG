# Demo del Core Engine (prototipo v2)

Prototipo funcional del motor de optimización, escrito como demostración.

**Estado: referencia.** Se conserva para la presentación y como especificación viva de lo que
debe hacer `apps/web`. **No se migra código de aquí al monorepo sin un review humano previo.**

Para correrlo por separado, dentro de esta carpeta: `npm ci && npm run dev` (http://localhost:5173).
`npm test` corre las pruebas del motor, niveles, sincronización y reglas de Supabase.

## Qué agrega la v2 respecto de la demo archivada

- Árbol de habilidades con editor visual (React Flow) y su efecto en el optimizador.
- Hoja de personaje (equipo, retrato, subir de nivel) e imágenes propias de objetos (IndexedDB).
- Proyección por nivel (TEC-12, SIM-02 a SIM-04): curvas de crecimiento, niveles por puntos tipo
  Souls, curvas por tramos con topes blandos, historial y comparativa pasado/presente/futuro.
- Rutas (TEC-13), manejo global de errores (TEC-18) y flujo de jugador con modo avanzado.
- Ejemplos: RPG clásico con niveles, Souls por puntos y Paladín de WoW Midnight.
- Supabase: `supabase/migrations` con esquema y RLS (TEC-02/03, probado con PGlite),
  cuentas (AUT-1 a AUT-3) y juegos en la nube con conflictos (INV-8, TEC-08). Sin `.env`
  funciona igual, todo en el navegador. Pasos en `supabase/README.md`.

Las migraciones de `supabase/` y los tipos de `src/cloud/database.types.ts` pueden servir de
punto de partida para `supabase/` y `libs/shared-types` del monorepo, previo review.
