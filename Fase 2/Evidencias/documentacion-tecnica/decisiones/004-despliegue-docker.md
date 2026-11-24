# ADR 004: Despliegue estático con Docker para verificación

**Estado:** aceptada · **Fecha:** noviembre 2026

## Contexto

El instructivo del Capstone exige Dockerfile, `docker-compose.yml` y variables de entorno
documentadas. La aplicación, en cambio, es un sitio estático: no existe un servidor de aplicación
que contenerizar.

Esto plantea una tensión real: cumplir el requisito sin inventar una arquitectura inexistente.

## Decisión

Implementar un contenedor nginx que sirve el build estático, además del despliegue real en Vercel.
Docker permite verificar el build de producción en un entorno reproducible. No se utiliza para
operar el sistema en producción.

```
Dockerfile            build multietapa: Node compila y nginx sirve
docker-compose.yml    un servicio, con las variables inyectadas en el build
```

## Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| Backend Node ficticio para justificar Docker | inventar un servicio que no realiza ninguna función resulta peor que no tenerlo; un evaluador lo advierte |
| Servir con `vite preview` dentro del contenedor | es un servidor de desarrollo y no es apto para producción |
| Solo Vercel, sin Docker | no cumple el requisito explícito del instructivo |
| Docker también en producción | el hosting estático ya resuelve CDN y TLS; operar nginx no aporta valor |

## Consecuencias

**Beneficios:**

- El requisito se cumple de forma honesta.
- El build se verifica en un entorno reproducible: `docker compose up` sirve la aplicación.
- La imagen no incluye `node_modules` ni material académico. El build es multietapa y a la etapa final solo se copia el artefacto de `apps/web/dist`.

**Costos:** existen dos caminos de despliegue que deben mantenerse alineados. La mitigación consiste en que ambos ejecutan el mismo `nx build web`. De esta forma no pueden divergir en el resultado.

**Lo que este ADR deja explícito.** La ausencia de backend no es una omisión, sino la arquitectura.
El valor del proyecto reside en el motor del cliente y en el contrato abierto.

## Nota sobre variables

Las variables `VITE_*` se incorporan durante el build, por lo que son `ARG` de Docker y no secretos
de ejecución. La `anon key` es pública por diseño (ver ADR 003). La `service_role` nunca ingresa al
contenedor.
