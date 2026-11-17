# ADR 002 — El cálculo ocurre en el cliente

**Estado:** aceptada · **Fecha:** septiembre 2026

## Contexto

Optimizar una build significa explorar combinaciones de piezas de equipo y habilidades bajo
restricciones (presupuestos, topes, requisitos). El espacio crece de forma explosiva: con 8
ranuras y 20 candidatas por ranura hay más de 25 000 millones de combinaciones antes de
podar.

Había que decidir dónde se ejecuta esa búsqueda.

## Decisión

**En el navegador, en un Web Worker.** El servidor guarda y reparte optimizadores; nunca
calcula.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Servidor con cola de trabajos | Costo por usuario y límites de uso; una build lenta ocupa un worker |
| Servidor sin cola (síncrono) | Un cálculo de segundos bloquea la petición; no escala |
| Servidor para casos grandes, cliente para chicos | Dos implementaciones del mismo motor: dos verdades |
| Cliente en el hilo principal | Congela la UI durante la búsqueda |

## Consecuencias

**Ganamos:**

- Costo marginal cero por usuario: el cómputo es del usuario, no de la infraestructura.
- El inventario no sale del dispositivo. Privacidad por diseño, no por promesa.
- Funciona sin conexión una vez cargada la app.
- El progreso se puede mostrar mientras el motor trabaja.

**Costamos:**

- El motor debe ser rápido en hardware modesto. Se mitiga con branch and bound y poda por
  dominancia.
- El código del motor viaja al cliente: es público. Aceptable — es la ventaja competitiva
  menos relevante frente a la velocidad de iteración de la comunidad.
- Casos patológicos pueden tardar; se ofrece presupuesto de tiempo y estado cancelable.

**Restricción permanente:** cualquier funcionalidad futura que "necesite" cómputo en el
servidor debe justificarlo explícitamente; el valor por defecto es el cliente.
