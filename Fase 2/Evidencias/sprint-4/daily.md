# Sprint 4 — Daily

**Ventana:** 16 al 23 de noviembre de 2026. Jira lo fecha del 16 al 29, pero lo cerramos la noche
anterior a la presentación.

## Cómo nos coordinamos

Este sprint tuvo algo que los otros no: **nos juntamos en persona**. La hackatón que Matías había
propuesto en octubre se concretó, primero en casa de Ignacio y después los tres trabajando juntos
el 22 y 23.

El grupo de WhatsApp siguió siendo el canal diario, pero ya no era el único.

## 16 de noviembre (lunes)

Matías lanzó la propuesta: «¿sale hackatón esta semana en casa de Ignacio?». Ofreció martes,
jueves, viernes y sábado. Arturo no podía el viernes por un compromiso familiar. Propuso dejarla
para después del 23, para usar el feedback del profesor.

Matías prefirió hacer dos: una antes y una después. Ignacio dijo que estaba toda la semana en casa
y que decidieran el día.

En lo técnico no hubo movimiento. Las 28 historias que faltaban llegaron el 20 al ordenar Jira.

## 17 de noviembre (martes)

La jornada más cargada del proyecto en commits: 24 sin contar merges.

Pero empezó mal. Ignacio avisó que se había quedado dormido y que tenía dolor de estómago. Matías
insistió en ir igual, porque la entrega era la semana siguiente y había que saber qué dejar listo.

En el trayecto Arturo puso el calendario en claro: «el 24 tenemos que subir toda la documentación
y el GitHub. La presentación es el primero, pero todos entregan el 24». Matías respondió que quería
tener todo listo para la presentación, «es la nota más gorda».

Del trabajo: Docker (96b6752), CI que valida lo afectado (8b3af7f), arquitectura y ADR (e63a1fc),
verificación de producción con Supabase (01e1e30) y la migración a `us-west-2` (17292d2). También
entraron 6.3.2 a 6.3.4: Overview, tarjeta de objeto y tarjeta de personaje.

Se parchearon `zod` y `react-router` por vulnerabilidades del bundle (93364ff).

## 18 de noviembre (miércoles)

Jornada de calidad y de decisiones incómodas.

Matías había borrado el proyecto de Supabase porque estaba en Europa y creó dos nuevos en América
para bajar la latencia. Arturo preguntó lo primero que correspondía: «¿hiciste un backup del
contenido, cierto?». Matías respondió que en teoría sí, aunque podía haber quedado algo huérfano
por falta de id.

Después vino el análisis de Sonar. Matías lo compartió y comentó: «es un resultado bastante
aceptable para el desorden que hubo». Ignacio pensaba que estaría peor. Arturo preguntó si el
análisis tomaba la demo, y ahí salió una decisión: mientras la demo siguiera en el repositorio, el
número no iba a mejorar. Se acordó sacarla para repetir la medición. (Al final no se sacó, porque
la demo terminó siendo la evidencia de la entrega.)

En lo técnico: Sonar por CI con cobertura real (dca27b8), los tres hallazgos de la quality gate
(66c6816), la omisión del escaneo mientras no exista `SONAR_TOKEN` (adc8ab4) y los diagramas UML y
el plan de pruebas ampliado (b77b04b).

## 19 de noviembre (jueves)

Jornada de reparto de épicas. Matías contó que Sonar ya estaba configurado y que cada PR a `main`
analizaba el código: «Tenemos casi 90% de cobertura de pruebas lo cual es muy bueno».

Ignacio preguntó cuál era el módulo que Arturo quería que viera. La respuesta fue «la creación de
optimizadores». Ignacio tomó entonces las épicas 2 y 3, y preguntó a Matías si él estaba viendo algo
de eso. Matías respondió con claridad: «No estoy desarrollando. Solo estoy moviendo y creando
documentacion».

Arturo avisó que no había avanzado nada en dos días y que al día siguiente retomaba con todo.

## 20 de noviembre (viernes)

Cumpleaños de Arturo. Se lo saludó en el grupo desde temprano.

Jornada de trazabilidad y no de producto. Ignacio trabajó el editor: entró crear un optimizador
desde cero (CFG-05, 17d444e) y ajustó el estilo (c66b41c). Discutió con Arturo cómo mostrar los
géneros de los juegos, con dudas sobre si un listado o algo más simple.

Del lado de la gestión se ordenó Jira: se cerraron los sprints 0 a 3, se activó el Sprint 4, se
estimaron las historias sin puntos y se asignó sprint a las que no tenían. También se revisaron los
cuatro sprints contra la API de Jira en lugar del historial de commits, y se corrigieron las cifras
que no se sostenían.

Ignacio aprovechó para preguntar si Matías podía ver los previews de Vercel por rama. No podía.

## 21 de noviembre (sábado)

Un solo mensaje en el grupo: la necesidad de revisar la base de datos. No hubo trabajo en el
repositorio.

## 22 de noviembre (domingo)

La hackatón en casa de Ignacio. El grupo registra la logística del traslado: los horarios de salida
y el aviso de llegada de cada uno.

Ese día entraron los cimientos para editar la plantilla (998f123), el atributo base (CFG-01,
cec1a57), los criterios pendientes de CFG-05 (013e8b3) y CFG-06 (6cff5b7). También el cockpit 6.3.5
(896debf) y el ajuste de la prueba que el CI agotaba bajo carga (c313d8f).

Matías compartió los enlaces de preview de Vercel por rama, para no depender de él para ver los
cambios. Ahí quedó resuelta esa fricción del día 20.

## 23 de noviembre (lunes)

Cierre del sprint, con el equipo trabajando junto desde temprano.

Matías aprobó los PR pendientes de Ignacio y de Arturo y avisó que dejaría la documentación lista
ese día. Después le pidió a Ignacio que arreglara la página principal, que debía estar rota por el
cambio de base de datos.

La jornada más productiva del proyecto en un solo día: 34 confirmaciones sin contar merges.

En el editor entró el bloque completo de atributos. Listar con búsqueda, orden y estado de uso
(CFG-02, `58c4980`), editar sin romper las fórmulas que referencian el atributo (CFG-03,
`40cbc0e`) y eliminar avisando qué depende de él (CFG-04, `bd4b437`).

El guardado en la cuenta quedó funcionando de punta a punta (`8eb7884`). El botón estaba siempre
visible pero decidía mal: pasó a flotante y a decidir al pulsarlo (`b92a37a`, `bcf96cd`). El autor
puede estrenar un juego al guardar su optimizador (`b98deb0`), y el borrado de un borrador ya no
deja una fila huérfana en la nube (`5f63bb9`).

En el optimizador se cerró el cockpit con condiciones desde la barra y comparación plegable
(`3bd3e2a`), con sus correcciones de superficie (`2f0184a`, `e4bd3bd`), y entró el presupuesto de
habilidades por nivel (`6f6d839`).

En calidad se cerraron el quality gate de Sonar y el S4036 del generador de ERD (`6c12efa`). El test
intermitente del optimizador recibió su tercera corrección y esta vez la causa era real (`275db33`).

Al final de la jornada se revisaron los cuatro sprints contra la API de Jira y se crearon las siete
historias que faltaban: análisis estático, Docker, pipeline de integración continua, documentación
técnica, catálogo normalizado, guardado en la cuenta y lectura portable de fixtures. Eran 34 puntos
de trabajo real sin tarjeta.

El sprint cerró con 79 de 196 puntos cerrados y 825 pruebas unitarias más 27 recorridos de extremo a
extremo. El motor pasó de 182 a 197 casos con el bloque de atributos.

## Lo que dice este sprint

Este sprint no se parece a los anteriores. Los tres estuvimos juntos dos días completos, y eso se
ve en el volumen: 91 confirmaciones, más que los otros tres sprints juntos.

El 22 y el 23 concentraron el 75 % de lo que se cerró. Antes de la hackatón había 20 puntos
cerrados; al terminar había 79.

La hackatón funcionó. Lo que en octubre era una idea que Arturo miraba con reservas terminó siendo
la forma en que el proyecto llegó terminado a la entrega.

Lo que no se alcanzó es el editor de variables. Quedó empezado y sin código. Se declara así en el
backlog en lugar de marcarlo como terminado.
