# Sprint 1 — Daily

**Ventana:** 5 al 18 de octubre de 2026.

## Cómo nos coordinamos

Este sprint no tuvo reuniones diarias formales. Nos escribíamos por el grupo de WhatsApp del
equipo y, cuando la decisión necesitaba pantalla compartida, hacíamos una llamada por Discord.
Ninguna de esas llamadas quedó grabada.

Lo que sí quedó es el grupo. La conversación está exportada y las fechas coinciden con los
commits del repositorio. Ese es el registro que respalda esta bitácora: no un acta levantada al
cierre de cada jornada, sino los mensajes que intercambiamos mientras trabajábamos.

## 5 de octubre (lunes)

Arranque sin ceremonias. Ignacio subió la demo a una rama aparte y la dejó como pull request en
borrador. Arturo respondió que la revisaría cuando llegara a su casa.

Nadie quiso mezclar todavía. La demo funcionaba, pero estaba a medio terminar y era mejor mirarla
antes de integrarla. Ese pull request en borrador fue la primera decisión del sprint.

## 6 de octubre (martes)

Cayó el bootstrap del monorepo (TEC-10) y con él el prototipo completo del motor en `demo/`, con
niveles, árbol de habilidades y Supabase (PR #2).

Quedó claro desde ese día que el prototipo no se migraba tal cual. Servía como referencia, y el
código que fuera al monorepo se escribiría de nuevo.

## 7 de octubre (miércoles)

Arturo se enfermó y avisó por el grupo. No hubo movimiento en el repositorio. La jornada se cerró
ahí.

## 8 de octubre (jueves)

Arturo contó que estaba con un curso y que tenía plazo hasta el sábado. Prometió dedicarle el fin
de semana completo y el lunes. Cumplió: el lunes siguiente entró el motor.

## 11 de octubre (domingo)

Matías avisó que andaba ocupado y que probablemente no estaría en su casa. No hubo mensajes
técnicos ni movimiento en el repositorio.

## 12 de octubre (lunes)

Feriado, y aun así la jornada más productiva del sprint. Entraron tres cosas grandes: el motor
portado con pruebas (0bfedfc), el contrato de juego con Zod (72907d6) y el primer `vercel.json`
(bddc8fe).

En el grupo se discutió dónde desplegar. Ignacio preguntó si iba a ser Vercel y explicó que tenía
conexión directa con Supabase, pero con un problema: Vercel creaba el proyecto de Supabase como
uno nuevo. Matías no lo sabía y ahí mismo se enteró. También se enviaron las invitaciones al
proyecto de Supabase para que los tres tuvieran acceso.

La decisión del día: el motor se porta con pruebas y no se copia. Eso permitió dejar `demo/`
congelado sin arrastrar deuda.

## 13 de octubre (martes)

Jornada de infraestructura. Las migraciones de Supabase pasaron a ser idempotentes (8c78dd5), se
resolvió un conflicto de `vercel.json` conservando la versión de GitHub (2ce806d) y se recolectó
la evidencia de la fase (9aa3f81).

En el grupo circuló un análisis de la diferencia de vida máxima en HP, con sus imágenes. Fue la
primera vez que comparamos nuestro resultado contra una herramienta existente. También se acordó
un horario de trabajo para el miércoles a las 20:00.

## 16 de octubre (viernes)

Autenticación e inventario en la nube (AUT-1, AUT-2, INV-8). Fueron 10 puntos que Jira dio por
cerrados ese día.

No hay commit que lo respalde. El historial salta del 13 al 19 de octubre, y las rutas que hoy
implementan esas historias se escribieron en noviembre. La fecha proviene de Jira y el repositorio
no la sostiene. Está explicado también en [`burndown.md`](./burndown.md), que dibuja esos puntos
como no fechados.

## 17 de octubre (sábado)

Arturo comentó que pensaba cambiarse a Linux y Matías indicó que seguía en Windows 10. No hubo
código: fue una jornada de conversación sobre el entorno de trabajo.

## 18 de octubre (domingo)

Cierre. 29 de 35 puntos, un 83 %. SP-02 apareció como `Done` en Jira sin fecha de transición
registrada. CFG-05 y CFG-06 se trasladaron al sprint siguiente.

## Lo que dice este sprint

El trabajo se concentró en cuatro jornadas, una de ellas feriado. Las demás fueron de
conversación, de enfermedad o de otros compromisos. Un sprint con cadencia diaria habría dado un
burndown suave. Este dio escalones, y el gráfico los muestra así.

No nos parece un problema. Tres personas con trabajos y otras asignaturas no producen un flujo
parejo. Lo que sí aprendimos es que coordinar por WhatsApp deja el avance invisible para quien mira
solo los commits.
