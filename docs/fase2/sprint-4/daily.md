# Sprint 4 — Daily (en curso)

**Ventana registrada:** 16 al 20 de noviembre de 2026. El sprint sigue abierto.

Bitácora reconstruida desde las fechas de commit. No existió un daily escrito.

## 16 de noviembre

- Arranca el sprint con 39 HUs abiertas: 11 propias del cierre y 28 arrastradas de los sprints 2 y
  3 durante el ordenamiento del 20 de noviembre.
- Se confirma el foco: **el editor de juegos** (atributos, variables, variantes), no las
  funcionalidades sociales.

## 17 y 18 de noviembre

- Trabajo en el modelo de variables: simple, derivada por fórmula y por categoría (CFG-07, CFG-08,
  CFG-09A y CFG-09B). Es la parte que el motor necesita para dejar de depender de variables
  escritas a mano.

## 19 de noviembre

- Avance en variantes de juego sin modificar el original (CFG-11). La decisión de diseño: una
  variante es una copia con linaje, no una referencia al original.

## 20 de noviembre

- **Editor.** Entra `5c4cbe7` — crear un optimizador desde cero (CFG-05). Es la primera HU de
  configuración con código en `apps/web`.
- Estilo del editor: se quitan las rayas largas de textos y comentarios (`5de1b84`).
- **Ordenamiento de Jira.** Se cierran los sprints 0 a 3, se activa el Sprint 4, se estiman 16 HUs
  que no tenían puntos y se asigna sprint a las 9 que no tenían ninguno.
- Se cierra SP-01, pendiente desde el sprint de arranque.
- Se verifica la documentación de la Fase 2 contra la API de Jira en lugar de contra el historial
  de commits.

## Observación

El día 20 no fue de desarrollo de producto: fue de corrección de la trazabilidad. La consecuencia
es concreta: **desde ese día las cifras de los documentos y las de Jira son la misma cosa**, en
lugar de dos relatos que había que mantener sincronizados a mano.
