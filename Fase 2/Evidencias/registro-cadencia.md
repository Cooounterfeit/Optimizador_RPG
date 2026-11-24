# Registro de cadencia — Fase 2

Bitácora diaria del 5 de octubre al 23 de noviembre de 2026, con una entrada por día hábil.

**Cómo está escrito este documento.** Cada día tiene su entrada, incluidas las jornadas sin
movimiento. Cuando no hubo cambios en el repositorio, la entrada lo declara y comenta la situación
del equipo según la documentación del sprint. La daily es asíncrona y escrita
([ADR 006](./gestion/006-cadencia-daily.md)). Cada integrante deja su bloque cuando trabaja, y
si no hay novedades la sesión termina en la revisión del tablero.

**Por qué se declara la fuente.** Un registro que presente como acta algo que no ocurrió no sirve
para trazabilidad, porque se contrasta con el historial de commits y con Jira. Cada entrada cita el
commit que la respalda o declara de forma explícita que no existe.

**Corte:** 23 de noviembre de 2026, fecha de cierre del Sprint 4.

**Cobertura:** los 35 días hábiles del período, más las fechas de cierre y los fines de semana con
actividad.

---

## Sprint 1 — 5 al 18 de octubre

**05-oct (lun).** Arranque del sprint sin movimiento en el repositorio. La primera jornada fue de
coordinación: definir el alcance y el reparto del trabajo.

**06-oct (mar).** Jornada intensa. Se crea el monorepo con NX y se incorpora el prototipo v2
completo, con niveles, habilidades y Supabase (`0469105`, `b4cafde`). La decisión del día consistió
en dejar el prototipo archivado en `demo/` como referencia y no migrarlo tal cual.

**07-oct (mié).** Sin cambios en el repositorio. El prototipo acababa de ingresar y el paso
siguiente, portar el motor a TypeScript puro, todavía no había comenzado.

**08-oct (jue).** Sin cambios. La misma situación: entre el prototipo y el port mediaba lectura de
código, que no genera commit.

**09-oct (vie).** Sin cambios. Cierre de semana sin integraciones.

**12-oct (lun).** Feriado nacional, con trabajo registrado. Ingresa el motor portado con pruebas
(`0bfedfc`), el contrato de juego completo con Zod (`72907d6`) y el primer `vercel.json`
(`bddc8fe`). Comentario del día: el motor se porta con pruebas y no se copia, lo que permite dejar
`demo/` congelado sin arrastrar deuda.

**13-oct (mar).** Jornada de infraestructura y entrega. Las migraciones de Supabase pasan a ser
idempotentes (`8c78dd5`), se resuelve el conflicto de `vercel.json` conservando la versión de GitHub
(`2ce806d`), se configura Vercel para el prototipo (`c7379b8`) y se recolecta la evidencia de la
fase (`9aa3f81`). Comentario: sin migraciones repetibles no existía forma de levantar el esquema
desde cero.

**14-oct (mié).** Sin cambios. El motor y el contrato ya estaban listos, y faltaba cerrar el
sprint.

**15-oct (jue).** Sin cambios en el repositorio.

**16-oct (vie).** Sin cambios en el repositorio. En Jira se reportan autenticación e inventario en
la nube (**AUT-1**, **AUT-2**, **INV-8**), sin commit que lo respalde. El historial salta del 13 al
19, y las rutas que hoy las implementan son de noviembre. Está declarado en
[`sprint-1/daily.md`](./sprint-1/daily.md) y dibujado como no fechado en
[`sprint-1/burndown.md`](./sprint-1/burndown.md).

**18-oct (dom).** Fuera de día hábil, pero es la fecha de cierre. Se completan 29 de 35 puntos.
**SP-02** queda `Done` en Jira sin fecha de transición, y CFG-05 y CFG-06 se trasladan al siguiente
sprint.

> Lectura del sprint: el trabajo se concentró en cuatro jornadas, una de ellas feriado. Un sprint
> con cadencia diaria habría producido un burndown suave. Este produjo escalones, y así está
> dibujado.

## Sprint 2 — 19 de octubre al 1 de noviembre

**19-oct (lun).** Se integra `origin/main` con la evidencia de la fase y se corrige la aserción e2e
del título. El cambio de marca había roto una comparación de texto exacto (`995b63c`).

**20-oct (mar).** Sin cambios en el repositorio. El sprint comenzaba con el modelo de datos y las
políticas de acceso sobre la mesa, que es trabajo de decisión y no genera commit.

**21-oct (mié).** Sin cambios. La discusión del modelo de datos continuaba abierta.

**22-oct (jue).** Sin cambios. Se define el criterio visual del catálogo, todavía sin código.

**23-oct (vie).** Sin cambios. Cierre de semana sin integraciones.

**26-oct (lun).** Sin cambios en el repositorio, pero la jornada dejó consecuencias. Se registra el
problema del lockfile (**IMP-05**): `@zenith/core-engine` no figuraba en `package-lock.json` y un
`npm ci` limpio fallaba. Queda anotado en
[`sprint-2/impedimentos.md`](./sprint-2/impedimentos.md).

**27-oct (mar).** Sin cambios. El bloqueo del lockfile seguía abierto.

**28-oct (mié).** Sin cambios. Se define cómo se probarían las políticas RLS (**IMP-06**), que
hasta entonces solo se comprobaban de forma manual en el panel.

**29-oct (jue).** Sin cambios. Se decide generar los tipos de dominio desde el esquema en lugar de
mantenerlos a mano (**IMP-07**).

**30-oct (vie).** Sin cambios. Cierre de semana: las tres decisiones están tomadas y esperan
código.

**25-oct (dom).** Fuera de día hábil. Se mergea el PR #3 y se corrige el lockfile (`f2ce2c9`).

**1-nov (dom).** Fuera de día hábil, y la jornada más densa del sprint. El esquema pasa al
repositorio y RLS se prueba con Postgres embebido (`17044c6`), los tipos se generan desde Supabase
(`e07db01`) y se cubren los casos borde del motor (`acfd547`). Los tres impedimentos quedaron
cerrados ese día.

> Lectura del sprint: medido por commits parece vacío. Medido por decisiones tomadas es el más
> denso del proyecto. El registro lo muestra así de forma deliberada.

## Sprint 3 — 2 al 15 de noviembre

**02-nov (lun).** Persistencia local con Dexie (**F3**, `15e72c4`) y exclusión de los archivos
`.env` salvo el de ejemplo (`3b058f2`).

**03-nov (mar).** Ajuste sobre lo anterior: los juegos pasan a funcionar como caché y los datos del
jugador se eliminan por separado (`020a31a`). Comentario del día: mezclar ambos borrados hacía
perder el inventario al limpiar la caché.

**04-nov (mié).** Sin cambios. Se define la estructura del shell y del hub antes de escribir
componentes.

**05-nov (jue).** Jornada extensa. Ingresa el shell con el diseño V4 (**F4**, `22f5d22`), el hub
real con Supabase, cuentas y perfil (**F5**, `45e3a52`), y el workflow de CI con lint, test,
typecheck y build de los seis proyectos (`f8adce1`). Comentario: la vista `optimizer_cards` con
`security_invoker` resolvió el listado público sin exponer datos.

**06-nov (vie).** Se cierra la biografía del perfil (**AUT-3**, `00d0072`). La semana termina con
el producto dejando de ser una demostración.

**09-nov (lun).** Se cierra **F7** (`da98ffb`): panel de estadísticas, proyección por nivel e
historial de builds, además del optimizador y las habilidades.

**10-nov (mar).** Sin cambios. Se revisaba la coherencia entre lo que muestra la pantalla y lo que
calcula el motor.

**11-nov (mié).** Se corrige esa coherencia (**6.1**, `f803d2f`), y el límite de tiempo del
optimizador pasa a ser un campo en segundos con clave por contenido real (`d66d4f7`).

**12-nov (jue).** Sin cambios en el repositorio. El ajuste del aviso por curva se estaba
preparando, e ingresa al día siguiente.

**13-nov (vie).** Ingresa la hoja de personaje con nivel libre y selector en rejilla (**6.2b**,
`968d5c0`), el build equipable con panel de comparación (**6.2**, `8bb6b71`) y el aviso de curva
sin uso una sola vez por curva y no por perfil (`8827b9c`).

**7 y 8-nov (sáb y dom).** Fuera de día hábil. Se completa **F6.1** a **F6.4**: juego semilla,
catálogos, importación GOOD, assets fuera del código y reglas del juego en datos (`ccb8488`,
`6999e03`, `0749470`, `dea5ede`).

> Lectura del sprint: siete de los diez días hábiles tienen commit. Aun así, el 60 % de los puntos
> se concentró en un solo día. El trabajo se integró por funcionalidad completa y no por partes
> demostrables.

## Sprint 4 — 16 al 23 de noviembre (hasta el corte)

**16-nov (lun).** Sin cambios en el repositorio. Arranque del sprint con el pendiente de los
anteriores encima. La prioridad era el despliegue y no la interfaz.

**17-nov (mar).** La jornada más cargada del proyecto. Infraestructura y despliegue: Docker
(`96b6752`), CI que valida lo afectado y audita (`8b3af7f`), arquitectura, entornos y ADR
(`e63a1fc`), verificación de producción con Supabase conectado (`01e1e30`) y migración a
`us-west-2` con el session pooler documentado (`17292d2`). Se suman las tres piezas de interfaz
**6.3.2 a 6.3.4**: Overview, tarjeta de objeto al pasar el cursor y tarjeta única de personaje
(`a0fcb94`, `b58b26d`, `d7a6a06`). Comentario: se parchean `zod` y `react-router` por
vulnerabilidades del bundle (`93364ff`).

**18-nov (mié).** Calidad. Ingresa el análisis de Sonar por CI con cobertura real (`dca27b8`), se
corrigen los tres hallazgos de la quality gate (`66c6816`) y se omite el escaneo mientras no exista
`SONAR_TOKEN` (`adc8ab4`). Además, diagramas UML, modelo de datos y plan de pruebas ampliado
(`b77b04b`). Comentario: la cobertura real importa, porque un análisis sin datos de cobertura no
aporta información.

**19-nov (jue).** Ingresan los documentos del Sprint 1 con evidencia gráfica (`244402f`) y se
corrige la justificación de `--skip-nx-cache` en Sonar (`373ad57`).

**20-nov (vie).** Día de trazabilidad y no de producto. Se verifica el Sprint 1 contra la API de
Jira (`a0b0def`, `d82f674`), se corrigen las cifras que no se sostenían (`21e3a5c`), se completan
los documentos de los sprints 2, 3 y 4 (`09a65f8`, `a2ac60b`, `086d48b`) y se enlazan los tags de
release (`f0f9c45`). También se ataca el test intermitente por sus dos causas reales (`e5af245`).
Comentario: desde este día las cifras de los documentos y las de Jira son la misma cosa.

**21-nov (sáb).** Fin de semana, sin actividad. Se declara en lugar de omitirse: la cadencia se
mide sobre días hábiles, y un sábado sin commits no constituye un día incumplido.

**22-nov (dom).** Fuera de día hábil, con actividad. Primera jornada de la hackatón, en casa de
Ignacio. Se cierra el editor con CFG-01 (`cec1a57`), CFG-05 completo (`013e8b3`) y CFG-06
(`6cff5b7`), además de los cimientos para editar la plantilla (`998f123`) y la validación contra el
inventario del navegador (`fc047d0`). Ingresa también el cockpit 6.3.5 (`896debf`) y el registro en
el changelog (`6dd2e13`). Comentario: diez commits en domingo. El equipo trabajó junto y se
repartieron los PR del día siguiente.

**23-nov (lun).** Cierre del sprint, con el equipo trabajando junto desde temprano. Es la jornada
con más commits del proyecto: 34 sin contar merges.

En el editor entran los tres atributos que faltaban: listar con búsqueda y orden (CFG-02,
`58c4980`), editar (CFG-03, `40cbc0e`) y eliminar (CFG-04, `bd4b437`). El guardado en la cuenta
queda operativo (`8eb7884`), con el autor habilitado para estrenar juego (`b98deb0`) y el borrado
sin filas huérfanas (`5f63bb9`). Se consolida 6.3.5 con condiciones desde la barra y comparación
plegada (`3bd3e2a`), con sus correcciones de superficie (`2f0184a`, `e4bd3bd`), y entra el
presupuesto de habilidades por nivel 6.4a (`6f6d839`).

En calidad se cierran el quality gate de Sonar y el S4036 del generador de ERD (`6c12efa`). Se
normaliza el catálogo de juegos y géneros (`97b46cf`), se corrige el test intermitente por su causa
real (`275db33`) y los fixtures se leen igual sin symlinks materializados (`4f60139`).

Al cierre de la jornada se crean en Jira las siete historias que faltaban: SonarQube, Docker,
pipeline de integración continua, documentación técnica, catálogo normalizado, guardado en la
cuenta y lectura portable de fixtures. Comentario: el sprint cierra con 79 de 196 puntos cerrados,
825 pruebas unitarias y la suite completa pasando.

---

## Cómo se verifica

El filtro por fecha de autor es el que corresponde. `--since` y `--until` comparan instantes y
arrastran commits de la madrugada siguiente por efecto de la zona horaria.

```bash
# Commits de un día, por fecha de autor
git log --format='%ad %h %s' --date=format:'%Y-%m-%d' \
  | grep '^2026-11-13 '
```

- **Entrada con commit.** El comando devuelve los hashes citados.
- **Entrada sin commits.** No devuelve ninguno. La entrada existe y comenta el estado según la
  documentación del sprint.
- **Entrada respaldada por Jira.** Se indica en el texto, con enlace al documento del sprint.

## Nota sobre el corte

El Sprint 4 cierra el **23 de noviembre a las 24:00**. Jira lo fecha del 16 al 29, pero la entrega
del Capstone se presenta el 24, por lo que el equipo cierra el sprint la noche anterior.

Con eso, el Sprint 4 acumula **seis días hábiles** (16, 17, 18, 19, 20 y 23), además del sábado 21
sin actividad y el domingo 22 con diez commits. La ventana completa del proyecto, del 5 de octubre
al 23 de noviembre, suma **35 días hábiles**, cada uno con su entrada.

Las fechas de cierre de sprint y los fines de semana con actividad aparecen al final de cada
sprint, después de los días hábiles, para no alterar el orden de la semana.
