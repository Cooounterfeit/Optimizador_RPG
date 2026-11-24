# Sprint 4 — Review

**Fecha de la sesión:** 20 de noviembre de 2026, con el sprint abierto.
**Cierre:** 23 de noviembre a las 24:00. Lo que sigue distingue lo que se dijo en la sesión de lo que
se verificó al cierre.

## Objetivo del sprint

> Documentación, integración continua, Docker y preparación de la demo final.

**Estado: cumplido.** Los cuatro componentes del objetivo tienen entrega verificable.

## Qué se demostró

### 1. La aplicación se construye y se sirve en un contenedor

Commit `96b6752`. La imagen construye el proyecto con Nx y sirve el resultado estático. Esto permite
verificar el build fuera de Vercel, que es donde aparecían los problemas de rutas y assets.

`docker compose up` levanta el servicio con un comando.

### 2. La integración continua valida, audita y mide

Commits `f8adce1`, `8b3af7f` y `dca27b8`. El pipeline ejecuta cuatro tareas sobre cada pull request:

- Lint, pruebas, tipos y build de lo afectado.
- Auditoría de dependencias de producción con nivel alto.
- Recorrido de extremo a extremo en Chromium, con el reporte adjunto si falla.
- Análisis estático con cobertura real y quality gate.

La rama `main` exige esos checks antes de integrar.

### 3. El editor funciona

Seis historias cerradas, con código verificable en el repositorio:

| HU | Qué permite |
|---|---|
| CFG-05 | crear un juego desde cero, con plantilla y validación |
| CFG-06 | ver la configuración completa en modo lectura |
| CFG-01 | crear un atributo base con identificadores y referencias |
| CFG-02 | listar los atributos con búsqueda, orden y estado de uso |
| CFG-03 | editar un atributo sin romper las fórmulas que lo referencian |
| CFG-04 | eliminar un atributo avisando qué depende de él |

Un usuario puede recorrer el editor completo de atributos. Lo que falta es el siguiente bloque:
variables y variantes.

### 4. El optimizador guarda en la cuenta

Commit `8eb7884`. El botón de guardar está siempre visible y la validación decide si procede. El
optimizador queda asociado al autor, y el autor puede estrenar un juego que aún no existe en el
catálogo. Sin esto, un optimizador vivía solo en el navegador.

### 5. El catálogo quedó normalizado

Commit `97b46cf`. La columna `category` de tipo texto se reemplazó por las tablas `genre` y
`game_genre`, con relación muchos a muchos. Un juego puede tener varios géneros y los valores
posibles tienen integridad referencial.

### 6. La documentación técnica está reescrita

Ocho documentos técnicos, seis ADR, README, CONTRIBUTING y CHANGELOG. No fue solo redacción: el
documento de arquitectura declaraba dos Web Workers cuando existe uno con dos modos, y ocho tablas
cuando existen catorce.

## Métricas al cierre

| Indicador | Valor |
|---|---|
| Puntos comprometidos | 196 |
| Puntos completados | 79 (40,3 %) |
| HUs cerradas | 20 de 46 |
| HUs en curso | 7 |
| HUs en revisión | 0 |
| Días hábiles | 6 de 6 |
| Confirmaciones de código | 91 |

## Qué falta

| Bloque | HUs | Puntos |
|---|---|---|
| Editor de variables y variantes | 6 | 31 |
| Configuración avanzada | 4 | 19 |
| Comunidad | 5 | 17 |
| Suscripciones | 4 | 16 |
| Técnicas del cierre | 6 | 29 |

TEC-22 no figura: la demo se conserva como evidencia hasta el fin de la asignatura.

## Lo que puede juzgarse

El objetivo declarado se cumplió. Quien revise este sprint debe mirar dos cosas por separado.

**La entrega.** Está lista: la demo se levanta, el editor de atributos funciona, la integración
continua está en verde y la documentación se lee sin ayuda.

**El alcance.** Creció un 21 % durante el sprint, de 162 a 196 puntos. El trabajo que no estaba en
Jira se creó y se cerró en lugar de dejarlo invisible. Eso baja el porcentaje de cumplimiento y
mejora la trazabilidad.

## Verificación al cierre

La suite completa pasa en Linux. En Windows fallan cinco casos del motor por un problema de enlaces
simbólicos: el repositorio guarda tres fixtures como symlink y Git en Windows los materializa como
archivos de texto con la ruta dentro. El arreglo existe en el commit `4f60139`, que agrega un lector
portable de fixtures, y está pendiente de integrar a `main`.

El conteo al cierre, medido el 24 de noviembre:

| Proyecto | Casos |
|---|---|
| Motor (`core-engine`) | 197 |
| Interfaz (`web`) | 416 |
| Base de datos (`supabase`) | 96 |
| Persistencia (`data-access`) | 76 |
| Inventario | 29 |
| Contrato (`shared-types`) | 11 |
| **Total unitarias** | **825** |
| Extremo a extremo | 27 |

Los 27 recorridos de extremo a extremo cubren los flujos que se presentan el 24: autenticación,
importación de inventario, optimización, comparación y guardado.
