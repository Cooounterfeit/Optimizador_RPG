# ADR 005: Despliegue mediante la integración de Git de Vercel

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

El despliegue debía resolver dos objetivos simultáneos. El primero consistía en publicar la versión final. El segundo, en ofrecer un ambiente de staging para probar cada cambio antes de que llegue a producción.

El estado inicial era confuso. El proyecto de Vercel servía el prototipo archivado, titulado «Zenith Optimizer Demo». La raíz del repositorio no tenía `vercel.json`. Además existía un workflow `deploy.yml` con la CLI de Vercel que nunca se había ejecutado. Dependía de tres secrets cuya
existencia no está registrada.

## Decisión

Utilizar la **integración nativa de Git de Vercel**: `main` despliega producción y cada pull
request genera un preview. Añadir **protección de rama** que exige los jobs del CI para permitir el
merge.

No se utilizan secrets de Vercel en GitHub Actions. El workflow `deploy.yml` se elimina.

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| GitHub Actions con `vercel deploy` y un token | reimplementa lo que Vercel ya hace, no genera previews por pull request y añade un token que rotar |
| Previews por integración y producción por Actions | dos caminos para el mismo resultado, con doble despliegue como fallo probable |
| Previews por integración y producción manual | el despliegue deja de ser reproducible y depende de que alguien lo recuerde |
| Eliminar `demo/` para evitar la confusión | no resuelve el problema: la configuración del proyecto reside en el dashboard y no en el repositorio |

## Consecuencias

**Beneficios:**

- No hay credenciales de Vercel que administrar.
- Staging sin hosting adicional: cada pull request dispone de su URL.
- Rollback y logs en un solo lugar.
- El build de producción utiliza el mismo comando que en local (`npx nx build web`).

**Costos:** el despliegue depende de un servicio externo con su propia interfaz. Algunos ajustes no
están en el repositorio y solo se consultan en el dashboard. La mitigación consiste en documentar
los ajustes esperados en `docs/entornos.md` y verificarlos mediante el log del build.

**Lo que este ADR hace explícito.** La validación no la aporta Vercel. Su build ejecuta
`vite build`, que omite los errores de TypeScript y emite el bundle de todas formas. Quien impide
publicar código roto es la protección de rama con el CI en verde. Confundir el despliegue con la
validación es el error que este ADR documenta para no repetirlo.

## Relación con el ADR 004

No lo contradice. Docker sigue siendo el entorno de verificación reproducible del build. Este ADR
define cómo llega ese build a producción. Ambos utilizan el mismo comando de Nx, de modo que no
pueden divergir en el artefacto.
