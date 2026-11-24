# ADR 002: El cálculo ocurre en el cliente

**Estado:** aceptada · **Fecha:** septiembre 2026

## Contexto

Optimizar una build implica explorar combinaciones de piezas de equipo y habilidades bajo
restricciones (presupuestos, topes y requisitos). El espacio crece de forma exponencial. Con 8 ranuras y 20 candidatas por ranura existen más de 25.000 millones de combinaciones antes de aplicar la poda.

Era necesario decidir dónde se ejecuta esa búsqueda.

## Decisión

La búsqueda se ejecuta en el navegador, dentro de un Web Worker. El servidor almacena y distribuye
los optimizadores, y nunca calcula.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Servidor con cola de trabajos | genera costo por usuario y límites de uso; una build lenta ocupa un worker |
| Servidor sin cola (síncrono) | un cálculo de segundos bloquea la petición y no escala |
| Servidor para casos grandes y cliente para casos pequeños | implica dos implementaciones del mismo motor, es decir, dos fuentes de verdad |
| Cliente en el hilo principal | congela la interfaz durante la búsqueda |

## Consecuencias

**Beneficios:**

- Costo marginal cero por usuario: el cómputo pertenece al usuario y no a la infraestructura.
- El inventario no sale del dispositivo. La privacidad es una propiedad del diseño y no una
  promesa.
- Operación sin conexión una vez cargada la aplicación.
- El progreso puede mostrarse mientras el motor trabaja.

**Costos:**

- El motor debe ser rápido en hardware modesto. Se mitiga con branch and bound y poda por
  dominancia.
- El código del motor llega al cliente y es público. Se acepta: la ventaja competitiva menos
  relevante frente a la velocidad de iteración de la comunidad.
- Los casos patológicos pueden tardar. Se ofrece un presupuesto de tiempo y un estado cancelable.

**Restricción permanente.** Cualquier funcionalidad futura que requiera cómputo en el servidor debe
justificarlo de forma explícita. El valor por defecto es el cliente.
