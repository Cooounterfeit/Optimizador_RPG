# Sprint 2 — Daily

**Ventana:** 19 de octubre al 1 de noviembre de 2026.

## Cómo nos coordinamos

Igual que el sprint anterior: grupo de WhatsApp y llamadas por Discord cuando hacía falta ver la
pantalla. Este sprint tuvo más conversación que código, y eso se nota en la bitácora.

La reorganización del 1 de noviembre salió de una discusión en el grupo, no de una reunión
planificada.

## 19 de octubre (lunes)

Arranque con una pregunta de Arturo: «¿han hecho commit?». Había revisado el repositorio y quería
saber en qué estaba cada uno antes de ponerse a trabajar.

Después de la clase en línea, Matías propuso algo concreto: «¿mañana nos ponemos a avanzar a las
9am? Podríamos aprovechar de avanzar». Esa fue la primera vez que el grupo acordó una hora para
trabajar juntos, aunque fuera a distancia.

Se integró `origin/main` con las evidencias de Fase 2 y se ajustó la prueba e2e del título. El
cambio de marca a «Zenith Optimizer» había roto una comparación de texto exacto (995b63c).

## 20 de octubre (martes)

La conversación fue de plazos. Arturo contó que le quedaban «como 4 semanas» y propuso algo que
después fue importante: «ojalá poder presentar la parte 2 en la primera semana de presentaciones,
así tenemos 2 semanas antes de la presentación con las personas».

Ese cálculo terminó definiendo el calendario del proyecto. No hubo código ese día.

## 21 de octubre (miércoles)

Ignacio mostró los mockups y fue honesto: «estuve viendo los mock ups, no veo algo que me guste,
intenté tomar ideas de las 2 páginas y como que nel». Pidió ideas al grupo.

Matías avisó que estaría ausente unos días porque le había surgido un trabajo. Arturo respondió
que al día siguiente empezaba a ver el tema y que le había gustado una web que Ignacio le había
mostrado antes.

## 22 de octubre (jueves)

Arturo pidió el nombre de esa web. Ignacio respondió: `questlog.gg`. Ahí salió la pregunta que
terminó definiendo el diseño visual: si estaba usando alguna skill o solo prompting. Ignacio
contestó que una mezcla de investigación propia y prompts.

Ese intercambio es el origen del diseño V4 que llegó después.

## 25 de octubre (domingo)

Dos cosas. La primera, técnica: apareció un correo de una acción en GitHub y Arturo aclaró que el
commit había sido suyo.

La segunda fue una idea de Matías que no prosperó: hacer una hackatón del equipo, toda la noche,
fuera del horario habitual. Arturo planteó dudas sobre el cansancio que implicaría y propuso
dejarlo para las últimas semanas. Matías quería probarlo pronto. La idea quedó ahí y volvió a
aparecer en el Sprint 4, donde sí se hizo.

También se mergeó el PR #3 y se corrigió el lockfile (f2ce2c9), porque `@zenith/core-engine` no
estaba registrado y un `npm ci` limpio fallaba.

## 27 de octubre (martes)

Jornada de referencias. Arturo compartió `prydwen.gg` como herramienta del nicho y comentaron lo
versátil que era. Fue la referencia que se usó después para comparar resultados.

## 1 de noviembre (domingo)

La jornada más densa del sprint, y empezó con una discusión de proceso. Arturo pidió a Matías
crear un estado «avanzado» en Jira porque «algunas ZO dependen de otras y "por hacer" o "en
revisión" suenan distinto a avanzados». Matías respondió que Jira ya permite marcar dependencias
entre historias. Discutieron un rato sobre cómo modelar las pruebas cuando dependen de una
funcionalidad que aún no existe.

Al final Matías aceptó agregar el estado. Ahí se acordó también crear dos proyectos de Supabase,
uno de producción y otro de desarrollo, y Arturo pidió permisos de administrador.

En lo técnico entraron las tres piezas del sprint:

- **Esquema en el repositorio** (17044c6). Las migraciones dejaron de vivir en la consola de
  Supabase y pasaron a `supabase/migrations/`, aplicables desde cero.
- **Pruebas RLS automatizadas** con `@electric-sql/pglite`. Un Postgres embebido permite probar
  las políticas en CI sin servidor ni credenciales.
- **Tipos generados desde el esquema** (e07db01), más los casos borde del motor (acfd547).

Los tres impedimentos del sprint quedaron cerrados ese día.

## Lo que dice este sprint

Tres días con actividad en dos semanas, y ninguno de los tres fue un día de trabajo continuo: el
19 fue una pregunta, el 25 una idea, y el 1 de noviembre una jornada larga que cerró todo.

Medido por commits, el sprint parece vacío. Medido por decisiones —el modelo de datos, las
políticas de acceso, los criterios visuales, el calendario del proyecto— es el más denso del
proyecto.

El costo de coordinarse por chat es ese: el avance no deja rastro hasta que se convierte en
código.
