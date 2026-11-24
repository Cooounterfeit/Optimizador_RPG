# Sprint 3 — Daily

**Ventana:** 2 al 15 de noviembre de 2026.

## Cómo nos coordinamos

Grupo de WhatsApp durante todo el sprint y una jornada de Discord que se extendió por horas el 13
de noviembre. Ese día hay 338 mensajes en el grupo: es el más cargado de todo el proyecto.

Ese 13 de noviembre fue donde se repartió el trabajo del resto del curso.

## 2 de noviembre (lunes)

Jornada sin trabajo técnico. Arturo compartió una referencia visual de un juego y Matías comentó
sobre la estética.

## 3 de noviembre (martes)

Jornada de diseño. Ignacio y Matías llegaron más tarde de lo previsto y avisaron por el grupo.

Arturo compartió `frontpage-v4.html` y mencionó la tipografía ANTON. Ignacio subió un comprimido
con los PNG del UX. Ahí nació el diseño V4 que terminó siendo el de la aplicación.

Arturo avisó que no se conectaría a las 3 como había dicho, porque recién llegaba a su casa, y
quedó en retomar más tarde.

## 5 de noviembre (jueves)

La jornada técnica del sprint. Arturo preguntó si los juegos de la web estaban en Supabase o
hardcodeados. Ignacio aclaró que eran de muestra y vivían como `.json`.

Entraron el shell con el diseño V4 (22f5d22), el hub real con Supabase, cuentas y perfil (45e3a52)
y el workflow de CI (f8adce1). Arturo configuró la protección de la rama `main` con la CLI de
GitHub, para exigir los checks antes de mergear.

## 8 de noviembre (domingo)

Arturo probó el optimizador y compartió video. Su mensaje: «el optimizador está corriendo. Nose si
bien». Pero lo importante fue lo que preguntó después: quería hacer un optimizador para un MOBA,
con recomendaciones de early, mid y late game, y que funcionara sin inventario porque ese género no
tiene inventario por cuenta.

Esa pregunta fue la prueba real de que el motor era agnóstico. Si servía para un MOBA, servía para
cualquier cosa.

Entraron F6.1 a F6.4 (ccb8488, 6999e03, 0749470, dea5ede), que cerraron la parte de inventario y
catálogos.

## 10 de noviembre (martes)

Sin trabajo técnico. Solo coordinación de clase: Arturo había anotado mal el horario y el grupo
acordó un punto de encuentro en la sede.

## 13 de noviembre (viernes)

El día más largo del proyecto en conversación: 338 mensajes. Fue una sesión de Discord que duró
horas y sirvió para repartir el trabajo.

Matías abrió la jornada confirmando que tenía el día libre para trabajar. Pero antes de tocar
nada preguntó algo que evitó un problema: «¿alguien está trabajando en una versión más actualizada
de la que está en GitHub? Porque lo tengo descargado». No quería pisar trabajo de otro.

Arturo respondió que estaba viendo la sección de optimizar y que la iba a reordenar visualmente.
Después reconoció algo que fue importante: no le gustó cómo había quedado su propio traspaso de la
demo al repo principal con NX.

Ahí se hizo el reparto que definió el resto del curso. Arturo tomó la coherencia del cálculo (6.1).
El resto del equipo se dividió el editor y el optimizador.

En código entraron la coherencia entre estadísticas mostradas y cálculo (f803d2f), el límite de
tiempo en segundos (d66d4f7) y la hoja de personaje con selector en rejilla (968d5c0), mergeada por
el PR #10.

## Lo que dice este sprint

Este es el sprint donde el producto dejó de ser una demo. También es donde el equipo aprendió a
repartirse sin pisarse, y la pregunta de Matías del 13 de noviembre es la prueba: antes de trabajar,
preguntó qué versión tenía cada uno.

De los diez días hábiles, siete tienen commit, más el fin de semana del 7 y 8. Son 17 commits en
`main` sin contar merges. Aun así, el 60 % de los puntos cayó en un solo día, porque el trabajo se
integró por funcionalidad completa y no por partes demostrables.

La conversación no aparece en el gráfico. Las decisiones de ese 13 de noviembre, sí.
