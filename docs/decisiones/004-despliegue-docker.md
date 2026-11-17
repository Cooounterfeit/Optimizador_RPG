# ADR 004 — Despliegue estático con Docker para verificación

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

El instructivo del Capstone exige Dockerfile, `docker-compose.yml` y variables de entorno
documentadas. La app, en cambio, es un sitio estático: no hay servidor de aplicación que
contenerizar.

Eso plantea una tensión real: cumplir el requisito sin inventar una arquitectura que no
existe.

## Decisión

**Un contenedor nginx con el build estático**, más despliegue real en Vercel. Docker sirve
para verificar el build de producción en un entorno reproducible, no para operar el sistema
en producción.

```
Dockerfile        build multietapa: Node compila, nginx sirve
docker-compose.yml    un servicio, variables inyectadas en build
```

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Backend Node ficticio solo para justificar Docker | Inventar un servicio que no hace nada es peor que no tenerlo; un evaluador lo nota |
| Servir con `vite preview` en el contenedor | Es un servidor de desarrollo, no apto para producción |
| Solo Vercel, sin Docker | No cumple el requisito explícito del instructivo |
| Docker también en producción | El hosting estático ya resuelve CDN y TLS; operar nginx no aporta |

## Consecuencias

**Ganamos:** el requisito se cumple con honestidad; el build se verifica en un entorno
reproducible (`docker compose up` → app servida); la imagen no arrastra `node_modules` ni
material académico (76 MB, 1.7 MB de artefacto).

**Costamos:** dos caminos de despliegue que hay que mantener alineados. Mitigación: ambos
usan el mismo `nx build web`, así que no pueden divergir en el resultado.

**Lo que este ADR deja explícito:** la ausencia de backend no es una omisión, es la
arquitectura. El valor del proyecto está en el motor del cliente y en el contrato abierto.

## Nota sobre variables

Las `VITE_*` se hornean en el build, así que son `ARG` de Docker, no secretos de runtime.
La `anon key` es pública por diseño (ver ADR 003); la `service_role` nunca entra al contenedor.
