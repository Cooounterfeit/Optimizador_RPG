# ADR 005 — Desplegar con la integración de Git de Vercel

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

El despliegue tenía que resolver dos cosas a la vez: publicar la versión final y ofrecer un
ambiente de staging para probar cada cambio antes de que llegue a producción.

El estado encontrado era confuso: el proyecto de Vercel servía el prototipo archivado
(*«Zenith Optimizer — Demo»*), la raíz del repo no tenía `vercel.json` y existía un workflow
`deploy.yml` con la CLI de Vercel que nunca se había ejecutado — dependía de tres secrets que
no consta que existieran.

## Decisión

**Integración nativa de Git de Vercel** (`main` → producción, cada PR → preview), más
**protección de rama** que exige los jobs del CI para mergear.

Sin secrets de Vercel en GitHub Actions. El workflow `deploy.yml` se elimina.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| GitHub Actions con `vercel deploy` y un token | Reimplementa lo que Vercel ya hace; no genera previews por PR; un token más que rotar |
| Híbrido: previews por integración, producción por Actions | Dos caminos para el mismo resultado, con doble deploy como fallo probable |
| Híbrido: previews por integración y producción manual | El despliegue deja de ser reproducible y depende de que alguien se acuerde |
| Borrar `demo/` para evitar la confusión | No resuelve nada: la configuración del proyecto vive en el dashboard, no en el repo |

## Consecuencias

**Ganamos:** cero credenciales de Vercel que administrar; staging sin hosting adicional (cada
PR tiene su URL); rollback y logs en un lugar; y el build de producción es el mismo comando
que se corre en local (`npx nx build web`).

**Costamos:** el despliegue depende de un servicio externo con su propia UI — hay ajustes que
no están en el repositorio y solo se ven en el dashboard. Mitigación: los ajustes esperados
están documentados en `docs/entornos.md` y se verifican leyendo el log del build.

**Lo que este ADR hace explícito:** la validación **no** la da Vercel. Su build es
`vite build`, que ignora los errores de TypeScript y emite el bundle igual. Quien impide
publicar código roto es la protección de rama con el CI en verde. Confundir el deploy con la
validación es el error que este ADR documenta para no repetirlo.

## Relación con ADR 004

No lo contradice. Docker sigue siendo el entorno de verificación reproducible del build; esto
define cómo llega ese build a producción. Ambos usan el mismo comando de Nx, así que no pueden
divergir en el artefacto.
