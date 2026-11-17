# Contribuir

Convenciones reales del repositorio. Si algo de acá no coincide con lo que ves en el
historial, gana el historial — y este documento se corrige.

## Puesta en marcha

```bash
git clone https://github.com/Cooounterfeit/Optimizador_RPG.git
cd Optimizador_RPG
nvm use          # toma la versión de .nvmrc (Node 22)
npm ci           # instala del lockfile y enlaza apps/* y libs/*
npx nx serve web # http://localhost:4200
```

- Copiá `apps/web/.env.example` a `apps/web/.env.local` si vas a usar Supabase. Sin
  variables, la app funciona en modo local.
- E2E requieren `npx playwright install` una vez.
- Tras `nx g`, corré `npm install`: el generador edita `package.json` pero no instala.

## Ramas

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feat/` | Funcionalidad nueva | `feat/hoja-personaje-selector` |
| `fix/` | Corrección | `fix/lockfile-core-engine` |
| `chore/` | Andamiaje, dependencias, configuración | `chore/bootstrap-monorepo` |

Se integra por pull request a `main`. La rama vive hasta que la funcionalidad está completa;
es normal que acumule varios commits.

## Commits

Formato: `tipo(alcance): resumen en presente`

```
feat(optimizer): hoja de personaje, nivel libre y selector en rejilla (6.2b)
fix(engine): avisar una vez por curva sin uso, no por perfil
ci: workflow de pruebas y build en GitHub Actions
test(core-engine): casos borde de TEC-12
```

- **Tipo:** `feat`, `fix`, `test`, `docs`, `chore`, `ci`.
- **Alcance:** el proyecto o dominio (`optimizer`, `engine`, `web`, `data-access`,
  `shared-types`, `inventory`, `supabase`).
- **Resumen:** qué cambia, no qué archivo se tocó.
- **Referencia al avance:** entre paréntesis cuando corresponde (`F6.4`, `6.2b`, `TEC-12`).

**Convención a cumplir:** cuando el cambio cierra una historia de usuario, el PR referencia
el issue de Jira (`ZO-xx`). El historial tiene commits sin esa referencia; los nuevos la
llevan.

## Antes de abrir un PR

```bash
npx nx affected -t lint typecheck test build
```

Las cinco puertas: lint, tipos, pruebas, build y sin vulnerabilidades altas. Si alguna falla,
el PR no se revisa.

Checklist del PR:

- [ ] Pruebas verdes (`nx affected -t test`)
- [ ] Lint y tipos sin errores
- [ ] Build de producción funciona
- [ ] Issue de Jira referenciado
- [ ] Documentación actualizada si cambió un contrato
- [ ] Changelog actualizado si el cambio es visible para el usuario

## Definition of Ready / Done

Ver `docs/definition-of-ready-done.md`. Resumen: una historia entra a un sprint solo con
criterios verificables y ≤ 13 puntos; está terminada solo con CI verde, PR revisado y
documentación al día.

## Cambios de contrato

`libs/shared-types` es el contrato entre capas. Si cambia:

1. Actualizá el esquema Zod y los tipos.
2. Ajustá los consumidores en el mismo PR (no en el siguiente).
3. Actualizá `libs/shared-types/README.md`.
4. Agregá el cambio al `CHANGELOG.md`.

Un cambio de contrato sin actualizar a sus consumidores deja `main` roto, así que no se
divide en dos PRs.

## Pruebas

- Unitarias: `npx nx test <proyecto>` (`core-engine`, `data-access`, `inventory`,
  `shared-types`, `web`, `supabase`).
- Todo: `npx nx run-many -t test`.
- E2E: `npx nx e2e web-e2e`.
- La estrategia completa está en `docs/estrategia-de-pruebas.md`.

## Estilo

ESLint y Prettier configurados; se aplican en `lint`. No se discute formato en los PRs: lo
resuelve la herramienta.

**Idioma:** comentarios y documentación en español; identificadores en inglés.
