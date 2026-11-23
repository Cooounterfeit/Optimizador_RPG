# Registro de cadencia — Fase 2

Bitácora diaria del 5 de octubre al 22 de noviembre de 2026, una entrada por día hábil.

**Cómo está escrito esto.** Cada día tiene su entrada, también los que no tuvieron movimiento.
Cuando no hubo cambios en el repositorio, la entrada lo dice y comenta en qué estaba el equipo
según la documentación del sprint. La daily es asíncrona y por escrito
([ADR 006](../decisiones/006-cadencia-daily.md)): cada uno deja su bloque cuando trabaja, y si
no hay novedades la sesión termina en la revisión del tablero.

**Por qué se declara la fuente.** Un registro que presente como acta algo que no ocurrió no
sirve para trazabilidad: se cruza con el historial de commits y con Jira. Cada entrada cita el
commit que la respalda, o dice explícitamente que no lo hay.

**Corte:** 22 de noviembre de 2026. El Sprint 4 sigue abierto.

**Cobertura:** los 35 días hábiles del período, más las fechas de cierre y los fines de semana
con actividad.

---

## Sprint 1 — 5 al 18 de octubre

**05-oct (lun).** Arranque del sprint sin movimiento en el repositorio todavía. La primera
jornada fue de coordinación: definir qué entraba en el alcance y cómo se repartía.

**06-oct (mar).** Jornada fuerte. Se crea el monorepo con NX y entra el prototipo v2 completo,
con niveles, habilidades y Supabase (`0469105`, `b4cafde`). La decisión del día: dejar el
prototipo archivado en `demo/` como referencia y no migrarlo tal cual.

**07-oct (mié).** Sin cambios en el repositorio. El prototipo acababa de entrar y el paso
siguiente —portar el motor a TypeScript puro— todavía no arrancaba.

**08-oct (jue).** Sin cambios. Misma situación: entre el prototipo y el port había lectura de
código, que no deja commit.

**09-oct (vie).** Sin cambios. Cierre de semana sin integraciones.

**12-oct (lun).** Feriado nacional, pero hubo trabajo igual: entra el motor portado con pruebas
(`0bfedfc`), el contrato de juego completo con Zod (`72907d6`) y el primer `vercel.json`
(`bddc8fe`). Comentario del día: el motor se porta con pruebas, no se copia; por eso `demo/`
puede quedar congelado sin arrastrar deuda.

**13-oct (mar).** Jornada de infraestructura y entrega. Las migraciones de Supabase se vuelven
idempotentes (`8c78dd5`), se resuelve el conflicto de `vercel.json` conservando la versión de
GitHub (`2ce806d`), se configura Vercel para el prototipo (`c7379b8`) y se recolecta la evidencia
de la fase (`9aa3f81`). Comentario: sin migraciones repetibles no había forma de levantar el
esquema desde cero.

**14-oct (mié).** Sin cambios. El motor y el contrato ya estaban; quedaba cerrar el sprint.

**15-oct (jue).** Sin cambios en el repositorio.

**16-oct (vie).** Sin cambios en el repositorio. En Jira se reportan autenticación e inventario
en la nube (**AUT-1**, **AUT-2**, **INV-8**), sin commit que lo respalde: el historial salta del
13 al 19 y las rutas que hoy las implementan son de noviembre. Está declarado en
[`sprint-1/daily.md`](./sprint-1/daily.md) y dibujado como no fechado en
[`sprint-1/burndown.md`](./sprint-1/burndown.md).

**18-oct (dom).** Fuera de día hábil, pero es la fecha de cierre: 29 de 35 puntos, **SP-02**
queda `Done` en Jira sin fecha de transición, y CFG-05 y CFG-06 se trasladan al siguiente.

> Lectura del sprint: el trabajo se concentró en cuatro jornadas, una de ellas feriado. Un
> sprint con cadencia diaria habría dado un burndown suave; este dio escalones, y así está
> dibujado.

## Sprint 2 — 19 de octubre al 1 de noviembre

**19-oct (lun).** Se integra `origin/main` con la evidencia de la fase y se corrige la aserción
e2e del título: el cambio de marca había roto una comparación de texto exacto (`995b63c`).

**20-oct (mar).** Sin cambios en el repositorio. El sprint arrancaba con el modelo de datos y las
políticas de acceso sobre la mesa, que es trabajo de decisión y no deja commit.

**21-oct (mié).** Sin cambios. La discusión del modelo de datos seguía abierta.

**22-oct (jue).** Sin cambios. Se define el criterio visual del catálogo, todavía sin código.

**23-oct (vie).** Sin cambios. Cierre de semana sin integraciones.

**26-oct (lun).** Sin cambios en el repositorio, pero el día dejó consecuencia: se registra el
problema del lockfile (**IMP-05**) — `@zenith/core-engine` no estaba en `package-lock.json` y un
`npm ci` limpio fallaba. Queda anotado en
[`sprint-2/impedimentos.md`](./sprint-2/impedimentos.md).

**27-oct (mar).** Sin cambios. El bloqueo del lockfile seguía abierto.

**28-oct (mié).** Sin cambios. Se define cómo se van a probar las políticas RLS (**IMP-06**), que
hasta entonces solo se comprobaban a mano en el panel.

**29-oct (jue).** Sin cambios. Se decide generar los tipos de dominio desde el esquema en vez de
mantenerlos a mano (**IMP-07**).

**30-oct (vie).** Sin cambios. Cierre de semana; las tres decisiones están tomadas y esperan
código.

**25-oct (dom).** Fuera de día hábil. Se mergea el PR #3 y se corrige el lockfile (`f2ce2c9`).

**1-nov (dom).** Fuera de día hábil, y la jornada más densa del sprint: el esquema pasa al repo y
RLS se prueba con Postgres embebido (`17044c6`), los tipos se generan desde Supabase
(`e07db01`) y se cubren los casos borde del motor (`acfd547`). Los tres impedimentos quedaron
cerrados ese día.

> Lectura del sprint: medido por commits parece vacío; medido por decisiones tomadas es el más
> denso del proyecto. El registro lo muestra así a propósito.

## Sprint 3 — 2 al 15 de noviembre

**02-nov (lun).** Persistencia local con Dexie (**F3**, `15e72c4`) y se ignoran los `.env` salvo
el de ejemplo (`3b058f2`).

**03-nov (mar).** Ajuste sobre lo anterior: los juegos pasan a ser caché y los datos del jugador
se borran aparte (`020a31a`). Comentario del día: mezclar ambas cosas en un solo borrado hacía
perder el inventario al limpiar la caché.

**04-nov (mié).** Sin cambios. Se define la estructura del shell y del hub antes de escribir
componentes.

**05-nov (jue).** Jornada grande. Entra el shell con el diseño V4 (**F4**, `22f5d22`), el hub
real con Supabase, cuentas y perfil (**F5**, `45e3a52`) y el workflow de CI con lint, test,
typecheck y build de los seis proyectos (`f8adce1`). Comentario: la vista `optimizer_cards` con
`security_invoker` resolvió el listado público sin exponer datos.

**06-nov (vie).** Se cierra la biografía del perfil (**AUT-3**, `00d0072`). La semana termina con
el producto dejando de ser una demo.

**09-nov (lun).** Se cierra **F7** (`da98ffb`): panel de estadísticas, proyección por nivel e
historial de builds, además del optimizador y las habilidades.

**10-nov (mar).** Sin cambios. Se estaba revisando la coherencia entre lo que muestra la pantalla
y lo que calcula el motor.

**11-nov (mié).** Se corrige esa coherencia (**6.1**, `f803d2f`) y el límite de tiempo del
optimizador pasa a ser un campo en segundos con clave por contenido real (`d66d4f7`).

**12-nov (jue).** Sin cambios en el repositorio. El ajuste del aviso por curva se estaba
preparando y entra al día siguiente.

**13-nov (vie).** Entra la hoja de personaje con nivel libre y selector en rejilla (**6.2b**,
`968d5c0`), el build equipable con panel de comparación (**6.2**, `8bb6b71`) y el aviso de curva
sin uso una sola vez por curva y no por perfil (`8827b9c`).

**7 y 8-nov (sáb y dom).** Fuera de día hábil. Se completa **F6.1** a **F6.4**: juego semilla,
catálogos, importación GOOD, assets fuera del código y reglas del juego en datos (`ccb8488`,
`6999e03`, `0749470`, `dea5ede`).

> Lectura del sprint: siete de los diez días hábiles tienen commit, y aun así el 60 % de los
> puntos cayó en un solo día, porque el trabajo se integró por funcionalidad completa y no por
> partes demostrables.

## Sprint 4 — 16 al 23 de noviembre (hasta el corte)

**16-nov (lun).** Sin cambios en el repositorio. Arranque del sprint con el pendiente de los
anteriores encima; la prioridad era el despliegue, no la interfaz.

**17-nov (mar).** La jornada más cargada del proyecto. Infraestructura y despliegue: Docker
(`96b6752`), CI que valida lo afectado y audita (`8b3af7f`), arquitectura, entornos y ADR
(`e63a1fc`), verificación de producción con Supabase conectado (`01e1e30`) y migración a
`us-west-2` con el session pooler documentado (`17292d2`). Y las tres piezas de interfaz
**6.3.2 a 6.3.4**: Overview, tarjeta de objeto al pasar el cursor y tarjeta única de personaje
(`a0fcb94`, `b58b26d`, `d7a6a06`). Comentario: se parchean `zod` y `react-router` por
vulnerabilidades del bundle (`93364ff`).

**18-nov (mié).** Calidad. Entra el análisis de Sonar por CI con cobertura real (`dca27b8`), se
corrigen los tres hallazgos de la quality gate (`66c6816`) y se omite el escaneo mientras no
exista `SONAR_TOKEN` (`adc8ab4`). Además, diagramas UML, modelo de datos y plan de pruebas
ampliado (`b77b04b`). Comentario: la cobertura real importa; un análisis sin datos de cobertura
no dice nada.

**19-nov (jue).** Entran los documentos del Sprint 1 con evidencia gráfica (`244402f`) y se
corrige la justificación de `--skip-nx-cache` en Sonar (`373ad57`).

**20-nov (vie).** Día de trazabilidad, no de producto. Se verifica el Sprint 1 contra la API de
Jira (`a0b0def`, `d82f674`), se corrigen las cifras que no se sostenían (`21e3a5c`), se completan
los documentos de los sprints 2, 3 y 4 (`09a65f8`, `a2ac60b`, `086d48b`) y se enlazan los tags de
release (`f0f9c45`). También se ataca el test intermitente con sus dos causas reales (`e5af245`).
Comentario: desde este día las cifras de los documentos y las de Jira son la misma cosa.

**21-nov (sáb).** Fin de semana, sin actividad. Se declara en lugar de omitirse: la cadencia se
mide sobre días hábiles, y un sábado sin commits no es un día incumplido.

**22-nov (dom).** Fuera de día hábil, con actividad: se cierra el editor con CFG-01 (`cec1a57`),
CFG-05 completo (`013e8b3`) y CFG-06 (`6cff5b7`), más los cimientos para editar la plantilla
(`998f123`) y la validación contra el inventario del navegador (`fc047d0`). Entra también el
cockpit 6.3.5 (`896debf`) y el registro en el changelog (`6dd2e13`). Comentario: diez commits en
domingo, y el sprint cierra al día siguiente; el editor se priorizó sobre las funcionalidades
sociales y se terminó a tiempo.

**23-nov (lun).** Cierre del sprint. Se consolida 6.3.5 con condiciones desde la barra y
comparación plegada (`3bd3e2a`), sus correcciones de superficie (`2f0184a`, `e4bd3bd`), el
presupuesto de habilidades por nivel 6.4a (`6f6d839`), el catálogo de juegos y géneros
normalizado (`97b46cf`) y la corrección del test intermitente (`275db33`). En calidad: el
quality gate de Sonar y el S4036 del generador de ERD (`6c12efa`). Y la documentación de entrega
(`966524d`). Comentario: se cierra con 182 casos del motor en verde y la suite completa pasando.

---

## Cómo se verifica

El filtro por fecha de autor es el que vale; `--since`/`--until` compara instantes y arrastra
commits de la madrugada siguiente por la zona horaria.

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

El Sprint 4 cierra el **23 de noviembre a las 24:00**. Jira lo fecha del 16 al 29, pero la
entrega del Capstone se presenta el 24, así que el equipo cierra el sprint la noche anterior.

Con eso, el Sprint 4 acumula **seis días hábiles** (16, 17, 18, 19, 20 y 23), más el sábado 21
sin actividad y el domingo 22 con diez commits. La ventana completa del proyecto (5 de octubre al
23 de noviembre) suma **35 días hábiles**, cada uno con su entrada.

Las fechas de cierre de sprint y los fines de semana con actividad aparecen al final de cada
sprint, después de los días hábiles, para no romper el orden de la semana.
