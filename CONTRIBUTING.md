# Contribuir

Convenciones reales del repositorio. Si algún punto no coincide con el historial de Git, prevalece
el historial y este documento se corrige.

## Puesta en marcha

```bash
git clone https://github.com/Cooounterfeit/Optimizador_RPG.git
cd Optimizador_RPG
nvm use          # toma la versión de .nvmrc (Node 22)
npm ci           # instala del lockfile y enlaza apps/* y libs/*
npx nx serve web # http://localhost:4200
```

- Copie `apps/web/.env.example` a `apps/web/.env.local` si va a utilizar Supabase. Sin variables,
  la aplicación funciona en modo local.
- Las pruebas e2e requieren `npx playwright install` una vez.
- Después de `nx g`, ejecute `npm install`. El generador edita `package.json` y no instala.

## Ramas

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | funcionalidad nueva | `feat/hoja-personaje-selector` |
| `fix/` | corrección | `fix/lockfile-core-engine` |
| `chore/` | andamiaje, dependencias y configuración | `chore/bootstrap-monorepo` |

La integración se realiza mediante pull request a `main`. La rama permanece abierta hasta que la
funcionalidad está completa, por lo que es normal que acumule varios commits.

## Commits

Formato: `tipo(alcance): resumen en presente`

```
feat(optimizer): hoja de personaje, nivel libre y selector en rejilla (6.2b)
fix(engine): avisar una vez por curva sin uso, no por perfil
ci: workflow de pruebas y build en GitHub Actions
test(core-engine): casos borde de TEC-12
```

- **Tipo:** `feat`, `fix`, `test`, `docs`, `chore` o `ci`.
- **Alcance:** el proyecto o dominio (`optimizer`, `engine`, `web`, `data-access`,
  `shared-types`, `inventory`, `supabase`).
- **Resumen:** qué cambia, no qué archivo se modificó.
- **Referencia al avance:** entre paréntesis cuando corresponde, por ejemplo `F6.4`, `6.2b` o
  `TEC-12`.

**Convención vigente.** Cuando el cambio cierra una historia de usuario, el pull request referencia
el issue de Jira (`ZO-xx`). El historial contiene commits sin esa referencia; los nuevos la
incluyen.

## Antes de abrir un pull request

```bash
npx nx affected -t lint typecheck test build
```

Se aplican cinco puertas: lint, tipos, pruebas, build y ausencia de vulnerabilidades altas. Si
alguna falla, el pull request no se revisa.

Lista de verificación del pull request:

- [ ] Pruebas en verde (`nx affected -t test`)
- [ ] Lint y tipos sin errores
- [ ] Build de producción funcional
- [ ] Issue de Jira referenciado
- [ ] Documentación actualizada si cambió un contrato
- [ ] Changelog actualizado si el cambio es visible para el usuario

## Definition of Ready y Done

Consulte `docs/definition-of-ready-done.md`. En resumen: una historia ingresa a un sprint solo con
criterios verificables y 13 puntos como máximo. Se considera terminada solo con CI en verde, pull
request revisado y documentación al día.

## Cambios de contrato

`libs/shared-types` constituye el contrato entre capas. Si cambia, se aplican cuatro pasos:

1. Actualizar el esquema Zod y los tipos.
2. Ajustar los consumidores en el mismo pull request, nunca en el siguiente.
3. Actualizar `libs/shared-types/README.md`.
4. Agregar el cambio al `CHANGELOG.md`.

Un cambio de contrato sin actualizar a sus consumidores deja `main` roto, por lo que no se divide
en dos pull requests.

## Pruebas

- Unitarias: `npx nx test <proyecto>`, con `core-engine`, `data-access`, `inventory`,
  `shared-types`, `web` y `supabase` como valores posibles.
- Todas: `npx nx run-many -t test`.
- Extremo a extremo: `npx nx e2e web-e2e`.
- La estrategia completa se documenta en `docs/estrategia-de-pruebas.md`.

## Estilo

ESLint y Prettier están configurados y se aplican en `lint`. El formato no se discute en los pull
requests: lo resuelve la herramienta.

**Idioma:** los comentarios y la documentación se escriben en español, y los identificadores en
inglés.
