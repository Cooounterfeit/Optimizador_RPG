# Aportes por integrante

Este documento responde al indicador de evaluación 9 del Capstone: evidencias dentro del
repositorio del aporte de cada integrante, que permitan identificar la equidad del trabajo y la
participación de cada estudiante.

Todo lo siguiente es verificable con comandos de Git sobre este repositorio. No existen
atribuciones estimadas: cada afirmación incluye su comando.

## Equipo

| Integrante | Rol | Foco principal |
|---|---|---|
| Ignacio Rodríguez | frontend y edición visual | editor de configuración de juegos, plantillas e interfaz del optimizador |
| Arturo Moya | motor de optimización | solver, contrato de juego, modelo de datos y rendimiento |
| Matías Molina | gestión, calidad y despliegue | backlog y sprints, pruebas, CI/CD, despliegue y documentación |

## Cómo verificar el aporte

```bash
# Requiere el .mailmap de la raíz, que unifica identidades del mismo autor
git shortlog -sne
```

Conteo al cierre del Sprint 4, el 23 de noviembre de 2026:

```
    82  Matías Molina <matias.molinaplaza@gmail.com>
    45  Arturo Moya <arturo.moya.contact@gmail.com>
    14  Ignacio Rodriguez <50534414+Ignacio-Rodriguez-A@users.noreply.github.com>
```

El conteo se incrementa con cada commit nuevo. Para consultar el valor vigente se ejecuta el primer
comando.

**Nota sobre Ignacio Rodríguez.** Su trabajo está repartido en dos identidades de Git. En octubre usó
la cuenta de GitHub (`50534414+Ignacio-Rodriguez-A@users.noreply.github.com`, 5 commits), y en
noviembre la cuenta personal (`rignacio871@gmail.com`, 9 commits, con el nombre `nSy0`). El archivo
`.mailmap` de la raíz las unifica para que el conteo refleje a la persona. No se reescribió
historia: los commits originales conservan su autor.

El `.mailmap` también normaliza el nombre en la búsqueda, por lo que los filtros utilizan el nombre
canónico:

```bash
git log --author="Ignacio" --oneline             # 14 commits
git log --author="Arturo Moya" --oneline         # 45 commits
git log --author="Matías Molina" --oneline       # 82 commits
```

Filtrar por el nombre anterior (`Moya-Art`, `nSy0`, `Cooounterfeit`) devuelve cero resultados una
vez aplicado el `.mailmap`. Para consultar las identidades originales de cada commit:

```bash
git log --author="Ignacio" --format="%h %an <%ae>"
```

## Aporte contrastado con el código

El número de commits no mide el aporte, porque existen commits que cierran una historia completa y
otros que ajustan una línea. Por esta razón, cada integrante se contrasta también con los módulos
que quedaron en `main`.

### Ignacio Rodríguez: editor y plantillas

| Artefacto | Contenido |
|---|---|
| `apps/web/src/features/editor/` | editor de configuración: `CreateOptimizerPage`, `ConfigurationPage`, `StatsEditor`, `blocks`, `skeleton`, `stat-id`, `name-rules` |
| `libs/core-engine/src/lib/ids.ts` y `references.ts` | generación de identificadores y resolución de referencias entre bloques de plantilla |
| `libs/shared-types/` | tipos del contrato consumidos por el editor |
| Pruebas del editor | `CreateOptimizerPage.spec`, `ConfigurationPage.spec`, `StatsEditor.spec`, `blocks.spec`, `skeleton.spec`, `stat-id.spec`, `name-rules.spec` |

Historias cubiertas: **CFG-05** (crear un optimizador desde cero), **CFG-06** (ver y validar la
configuración) y **CFG-01** (crear un atributo base en el editor). A ellas se suman los cimientos
del editor (`998f123`) y los criterios pendientes de CFG-05 (`013e8b3`).

```bash
git log --author="Ignacio" --name-only --format="" | sort -u | grep "features/editor"
```

### Arturo Moya: motor, contrato y datos

| Artefacto | Contenido |
|---|---|
| `libs/core-engine/src/lib/` | `optimizer.ts` (solver branch and bound), `formula.ts`, `graph.ts`, `curves.ts`, `leveling.ts`, `skills.ts`, `validate.ts` y `analysis.ts` |
| `libs/shared-types/src/lib/` | contrato del juego con Zod: `game-template`, `item`, `skills`, `leveling` y `solve` |
| `supabase/` | esquema completo con 14 tablas, 9 migraciones versionadas y pruebas RLS con PGlite (96 casos) |
| `libs/data-access/` | repositorios Dexie: inventario, equipo, niveles, habilidades e imágenes |
| `libs/inventory/` | parseo de inventario y formato GOOD |

Es el autor mayoritario del motor y del modelo de datos. Su trabajo explica que el motor sea
TypeScript puro y verificable sin navegador.

```bash
git log --author="Arturo Moya" --name-only --format="" | sort -u | grep -E "core-engine|shared-types|supabase"
```

### Matías Molina: gestión, calidad y despliegue

| Artefacto | Contenido |
|---|---|
| `docs/fase2/` | los cuatro sprints, con nueve documentos cada uno: planning, backlog, scrumboard, burndown, daily, impedimentos, release, review y retrospectiva |
| `docs/decisiones/` | seis ADR: NX, cálculo en el cliente, Supabase, Docker, Vercel y cadencia de la daily |
| `.github/workflows/ci.yml` | CI con `nx affected`, auditoría de dependencias, e2e en Chromium y Sonar con cobertura |
| `Dockerfile`, `docker-compose.yml`, `docker/` | build y servicio de producción verificable fuera de Vercel |
| `docs/estrategia-de-pruebas.md`, `docs/entornos.md`, `docs/arquitectura.md` | documentación técnica |
| `tools/` | `merge-coverage`, `check-genres`, `build-erd` y `upload-game-assets` |

```bash
git log --author="Matías Molina" --name-only --format="" | sort -u | grep -E "^docs/|workflows|Docker"
```

## Trabajo que no deja commit

Una parte del aporte no aparece en el historial. Se declara para no subestimar a ningún integrante:

| Actividad | Responsable | Motivo de la ausencia |
|---|---|---|
| redacción del backlog en Jira (83 historias, 332 puntos) | Matías Molina | Jira no escribe en el repositorio |
| decisiones de modelo de datos y RLS previas al código | Arturo Moya | se materializan después, en las migraciones |
| retrospectivas y revisiones | todo el equipo | producen acciones y no archivos |
| preparación de la defensa | todo el equipo | se realiza fuera del repositorio |

Estas actividades se documentan en `docs/fase2/`, mediante retrospectivas, impedimentos y reviews.

## Distribución por sprint

```bash
for s in 1 2 3 4; do
  echo "Sprint $s:"
  git shortlog -sne --since="<inicio>" --until="<fin>"
done
```

Los rangos se detallan en `docs/ritmo-de-trabajo.md`. El reparto no es uniforme por diseño. El motor
y el modelo de datos concentran el volumen de código en Arturo. El editor concentra el de Ignacio en
la última etapa. Matías sostiene la gestión y la calidad de forma transversal.

## Compromiso con la exactitud

Si alguna cifra de este documento no coincide con la salida de Git, prevalece Git y este documento
se corrige. La regla del repositorio es explícita: un dato sin fuente no se escribe.
