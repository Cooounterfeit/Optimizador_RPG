# Aportes por integrante

Este documento responde al indicador de evaluación 9 del Capstone: evidencias dentro del
repositorio del aporte de cada integrante, que permitan identificar la equidad en el trabajo y
la participación de cada estudiante.

Todo lo que sigue es verificable con comandos de Git sobre este repositorio. No hay
atribuciones estimadas: cada afirmación tiene su comando.

## Equipo

| Integrante | Rol | Foco principal |
|---|---|---|
| Ignacio Rodríguez | Frontend y edición visual | Editor de configuración de juegos, plantillas, UI del optimizador |
| Arturo Moya | Motor de optimización | Solver, contrato de juego, modelo de datos, rendimiento |
| Matías Molina | Gestión, QA y despliegue | Backlog y sprints, pruebas, CI/CD, despliegue, documentación |

## Cómo verificar el aporte

```bash
# Requiere el .mailmap de la raíz, que unifica identidades del mismo autor
git shortlog -sne
```

Salida al commit de cierre del Sprint 4 (`8398162`, 23 de noviembre):

```
    78  Matías Molina <matias.molinaplaza@gmail.com>
    45  Arturo Moya <arturo.moya.contact@gmail.com>
    14  Ignacio Rodriguez <50534414+Ignacio-Rodriguez-A@users.noreply.github.com>
```

**Nota sobre Ignacio.** Su trabajo está repartido en dos identidades de Git: en octubre usó la
cuenta de GitHub (`50534414+Ignacio-Rodriguez-A@users.noreply.github.com`, 5 commits) y en
noviembre la cuenta personal (`rignacio871@gmail.com`, 9 commits, nombre `nSy0`). El archivo
`.mailmap` de la raíz las unifica para que el conteo refleje a la persona. No se reescribió
historia: los commits originales conservan su autor.

Verificación individual. El `.mailmap` también normaliza el nombre en la búsqueda, así que los
filtros usan el nombre canónico:

```bash
git log --author="Ignacio" --oneline             # 14 commits
git log --author="Arturo Moya" --oneline         # 45 commits
git log --author="Matías Molina" --oneline       # 78 commits
```

Filtrar por el nombre viejo (`Moya-Art`, `nSy0`, `Cooounterfeit`) devuelve 0 una vez aplicado
el `.mailmap`. Para ver las identidades originales de cada commit:

```bash
git log --author="Ignacio" --format="%h %an <%ae>"
```

## Aporte por integrante, contrastado con el código

El conteo de commits no mide el aporte: hay commits que cierran una HU entera y otros que
ajustan una línea. Por eso cada integrante se contrasta contra los módulos que quedaron en
`main`.

### Ignacio Rodríguez — editor y plantillas

| Artefacto | Qué contiene |
|---|---|
| `apps/web/src/features/editor/` | Editor de configuración: `CreateOptimizerPage`, `ConfigurationPage`, `StatsEditor`, `blocks`, `skeleton`, `stat-id`, `name-rules` |
| `libs/core-engine/src/lib/ids.ts` y `references.ts` | Generación de identificadores y resolución de referencias entre bloques de plantilla |
| `libs/shared-types/` | Tipos del contrato consumidos por el editor |
| Pruebas del editor | `CreateOptimizerPage.spec`, `ConfigurationPage.spec`, `StatsEditor.spec`, `blocks.spec`, `skeleton.spec`, `stat-id.spec`, `name-rules.spec` |

HUs cubiertas: **CFG-05** (crear un optimizador desde cero), **CFG-06** (ver y validar la
configuración), **CFG-01** (crear atributo base en el editor), más los cimientos del editor
(`998f123`) y los criterios pendientes de CFG-05 (`013e8b3`).

```bash
git log --author="Ignacio" --name-only --format="" | sort -u | grep "features/editor"
```

### Arturo Moya — motor, contrato y datos

| Artefacto | Qué contiene |
|---|---|
| `libs/core-engine/src/lib/` | `optimizer.ts` (solver branch & bound), `formula.ts`, `graph.ts`, `curves.ts`, `leveling.ts`, `skills.ts`, `validate.ts`, `analysis.ts` |
| `libs/shared-types/src/lib/` | Contrato del juego con Zod: `game-template`, `item`, `skills`, `leveling`, `solve` |
| `supabase/` | Esquema completo con 14 tablas, 9 migraciones versionadas y pruebas RLS con PGlite (89 casos) |
| `libs/data-access/` | Repositorios Dexie: inventario, equipo, niveles, habilidades, imágenes |
| `libs/inventory/` | Parseo de inventario y formato GOOD |

Es el autor mayoritario del motor y del modelo de datos. Su trabajo explica que el motor sea
TypeScript puro y verificable sin navegador.

```bash
git log --author="Arturo Moya" --name-only --format="" | sort -u | grep -E "core-engine|shared-types|supabase"
```

### Matías Molina — gestión, calidad y despliegue

| Artefacto | Qué contiene |
|---|---|
| `docs/fase2/` | Los cuatro sprints con sus 9-10 documentos cada uno: planning, backlog, scrumboard, burndown, daily, impedimentos, release, review, retrospectiva |
| `docs/decisiones/` | Seis ADR: NX, cálculo en el cliente, Supabase, Docker, Vercel y cadencia de daily |
| `.github/workflows/ci.yml` | CI con `nx affected`, auditoría de dependencias, e2e en Chromium y Sonar con cobertura |
| `Dockerfile`, `docker-compose.yml`, `docker/` | Build y servicio de producción verificable fuera de Vercel |
| `docs/estrategia-de-pruebas.md`, `docs/entornos.md`, `docs/arquitectura.md` | Documentación técnica |
| `tools/` | `merge-coverage`, `check-genres`, `build-erd`, `upload-game-assets` |

```bash
git log --author="Matías Molina" --name-only --format="" | sort -u | grep -E "^docs/|workflows|Docker"
```

## Trabajo que no deja commit

Una parte del aporte no aparece en el historial y se declara para no subestimar a nadie:

| Actividad | Quién | Por qué no hay commit |
|---|---|---|
| Redacción del backlog en Jira (83 HUs, 332 puntos) | Matías Molina | Jira no escribe en el repositorio |
| Decisiones de modelo de datos y RLS previas al código | Arturo Moya | Se materializan después, en las migraciones |
| Retrospectivas y revisiones | Todo el equipo | Producen acciones, no archivos |
| Preparación de la defensa | Todo el equipo | Fuera del repositorio |

Estas actividades están documentadas en `docs/fase2/` (retrospectivas, impedimentos y
reviews), no en el historial de commits.

## Distribución por sprint

```bash
for s in 1 2 3 4; do
  echo "Sprint $s:"
  git shortlog -sne --since="<inicio>" --until="<fin>"
done
```

Los rangos están en `docs/ritmo-de-trabajo.md`. El reparto no es parejo por diseño: el motor y
el modelo de datos concentran el volumen de código en Arturo, el editor concentra el de Ignacio
en la última etapa, y Matías sostiene la gestión y la calidad de forma transversal.

## Compromiso con la exactitud

Si alguna cifra de este documento no coincide con lo que muestra `git`, manda Git y este
documento se corrige. La regla del repositorio es explícita: un dato sin fuente no se escribe.
