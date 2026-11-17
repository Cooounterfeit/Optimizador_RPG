# Entornos

La app es un sitio estático con variables **horneadas en el build**. No hay configuración de
runtime: el bundle que se sirve ya sabe a qué Supabase apunta. Esto simplifica el despliegue
y obliga a construir una vez por entorno.

## Matriz de ambientes

| Ambiente | Rama | Supabase | Datos | URL |
|---|---|---|---|---|
| Local | cualquiera | opcional | IndexedDB + fixtures | `http://localhost:4200` |
| Local con Docker | cualquiera | opcional (en build) | IndexedDB + fixtures | `http://localhost:8080` |
| Preview (PR) | rama del PR | proyecto real o mocks | según variables | URL del proveedor |
| Producción | `main` | proyecto real | datos reales | `optimizadorrpg.vercel.app` |

## Variables

Todas llevan prefijo `VITE_` y **terminan dentro del bundle**: son públicas, no secretos.
Vite solo expone las que empiezan con ese prefijo.

| Variable | Obligatoria | Efecto si falta | Dónde se usa |
|---|---|---|---|
| `VITE_SUPABASE_URL` | no | La app corre 100% local | `lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | no | La app corre 100% local | `lib/supabase.ts` |
| `VITE_USE_MOCKS` | no | Sin efecto | fuerza fixtures con `1` |

**Sin las dos primeras, la app no falla: funciona en modo local.** El cliente Supabase queda
en `null`, el hub usa fixtures y las pantallas de cuenta muestran un aviso. Ese es el modo
por defecto en desarrollo y en las pruebas e2e.

`VITE_USE_MOCKS=1` gana sobre las credenciales: aunque `.env.local` exista, se usan fixtures.
Sirve para el e2e y para revisar la UI sin tocar datos reales.

## Qué es público y qué es secreto

| Dato | ¿Público? | Protección real |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | Ninguna necesaria |
| `VITE_SUPABASE_ANON_KEY` | **Sí, por diseño** | Políticas RLS en Postgres |
| `service_role` key | **Nunca en el cliente** | — |
| `VERCEL_TOKEN` | No | Secret de GitHub Actions |

La `anon key` viaja al navegador y es visible en las herramientas de desarrollo. Eso es lo
previsto: Supabase la usa para identificar el proyecto, y **RLS decide qué puede hacer cada
usuario**. Si RLS está mal configurado, la anon key no protege nada. Por eso las políticas
se prueban (`supabase/tests/`) y no se asume que están bien.

La `service_role` key evita RLS por completo. Nunca se pasa al frontend ni se usa como `ARG`
en el build de Docker.

## Configurar en local

```bash
cp apps/web/.env.example apps/web/.env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npx nx serve web
```

`.env.local` está en `.gitignore`. Para trabajar sin red, dejar las variables vacías o poner
`VITE_USE_MOCKS=1`.

## Configurar con Docker

Las variables van en un `.env` junto a `docker-compose.yml`, o en el entorno del comando:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co \
VITE_SUPABASE_ANON_KEY=tu-anon-key \
docker compose up --build
```

**Cambiar una variable exige reconstruir la imagen**: `docker compose up --build` sin más no
la toma, porque el valor ya está dentro del bundle. `docker compose up` solo reinicia el
contenedor con el bundle anterior.

## Configurar en CI

Los secretos del repositorio (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) los usa
`.github/workflows/deploy.yml`. Las variables `VITE_*` de producción se configuran en el
proyecto del proveedor de hosting, no en GitHub: el build de producción ocurre allí.

## Regla de oro

> Si un valor no puede ser público, no puede tener prefijo `VITE_`.

Cualquier secreto real pertenece a una función del servidor o a un servicio externo, nunca al
bundle del navegador.
