# Entornos

La aplicación es un sitio estático con variables incorporadas durante el build. No existe
configuración en tiempo de ejecución: el bundle servido ya determina a qué proyecto de Supabase
apunta. Esto simplifica el despliegue y obliga a construir una vez por entorno.

## Matriz de ambientes

| Ambiente | Rama | Supabase | Datos | URL |
|---|---|---|---|---|
| Desarrollo | cualquiera | local (mocks o Supabase CLI) | IndexedDB + fixtures | `http://localhost:4200` |
| Docker local | cualquiera | el del build | IndexedDB + fixtures | `http://localhost:8080` |
| Staging | cada PR | **proyecto #1** | datos de prueba | URL del preview de Vercel |
| Producción | `main` | **proyecto #2** | datos reales | `https://optimizadorrpg.vercel.app` |

El ambiente de desarrollo no consume cupo de Supabase porque se ejecuta de forma local. Por esta
razón tres ambientes caben en el plan gratuito, que permite dos proyectos activos.

## Qué se despliega

| Carpeta | ¿Se despliega? | Motivo |
|---|---|---|
| `apps/web` | **Sí** | es la aplicación |
| `demo/` | **No** | prototipo archivado, ver `demo/NOTA.md` |

El build se genera con `npx nx build web` y produce `apps/web/dist`.

El proyecto de Vercel tiene **Root Directory vacío** (la raíz del repositorio) porque NX requiere
el workspace completo. Apuntarlo a un subdirectorio interrumpe la resolución de `libs/`.

## Variables

Todas las variables llevan prefijo `VITE_` y se incorporan al bundle. Son públicas y no
constituyen secretos. Vite solo expone las variables que comienzan con ese prefijo.

| Variable | Obligatoria | Efecto si falta | Ubicación |
|---|---|---|---|
| `VITE_SUPABASE_URL` | no | la aplicación opera en modo local | `lib/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | no | la aplicación opera en modo local | `lib/supabase.ts` |
| `VITE_USE_MOCKS` | no | sin efecto | fuerza fixtures con el valor `1` |

Sin las dos primeras variables, la aplicación no falla: opera en modo local. El cliente de Supabase
queda en `null`, el hub utiliza fixtures y las pantallas de cuenta muestran un aviso.

`VITE_USE_MOCKS=1` prevalece sobre las credenciales. Aunque existan, se utilizan fixtures.

### Reparto por ambiente en Vercel

| Variable | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | proyecto de producción | proyecto de staging | vacío |
| `VITE_SUPABASE_ANON_KEY` | proyecto de producción | proyecto de staging | vacío |
| `VITE_USE_MOCKS` | — | — | `1` |

Una variable `VITE_*` apuntando al proyecto de Supabase equivocado constituye el fallo más difícil
de detectar. La aplicación funciona correctamente, pero sobre los datos de otro ambiente.

## Qué es público y qué es secreto

| Dato | ¿Público? | Protección |
|---|---|---|
| `VITE_SUPABASE_URL` | sí | ninguna necesaria |
| `VITE_SUPABASE_ANON_KEY` | **sí, por diseño** | políticas RLS en Postgres |
| `service_role` key | **nunca en el cliente** | — |

La `anon key` se envía al navegador y resulta visible en las herramientas de desarrollo. Este
comportamiento es el previsto: Supabase la utiliza para identificar el proyecto, y RLS determina
qué puede hacer cada usuario. Si RLS está mal configurado, la `anon key` no protege los datos.

Por esta razón las políticas se verifican mediante pruebas (`supabase/tests/`, 89 casos) en lugar
de asumir que están correctas.

La `service_role` key omite RLS por completo. Nunca se transfiere al frontend ni se utiliza como
`ARG` en el build de Docker.

## Configuración local

```bash
cp apps/web/.env.example apps/web/.env.local
# completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npx nx serve web
```

`.env.local` está incluido en `.gitignore`. Para trabajar sin red, se dejan las variables vacías o
se define `VITE_USE_MOCKS=1`.

## Configuración con Docker

Las variables se declaran en un archivo `.env` junto a `docker-compose.yml`, o en el entorno del
comando:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co \
VITE_SUPABASE_ANON_KEY=tu-anon-key \
docker compose up --build
```

Modificar una variable exige reconstruir la imagen. `docker compose up` solo reinicia el contenedor
con el bundle anterior, porque el valor ya está incorporado en él.

## Despliegue en Vercel

El proyecto está conectado al repositorio mediante Git Integration. Cada push a `main` despliega
producción, y cada pull request genera un preview con su propia URL.

No se utilizan secrets de Vercel en GitHub Actions. La garantía de no publicar código roto proviene de la protección de rama. `main` solo acepta merges con los jobs de CI en verde.

### Ajustes del proyecto

| Ajuste | Valor |
|---|---|
| Root Directory | `./` (la raíz del repositorio) |
| Framework Preset | Other |
| Build Command | `npx nx build web` |
| Output Directory | `apps/web/dist` |
| Install Command | `npm ci` |
| Node | 22 |

Root Directory no se apunta a `apps/web`. NX resuelve `libs/` desde la raíz del workspace, y el
build falla al buscar `@zenith/core-engine`.

### Estado verificado (17-nov-2026)

| Comprobación | Resultado |
|---|---|
| Log del build | `nx run @zenith/web:build`, no ejecuta `demo` |
| Título en producción | `Zenith Optimizer · Proven builds, not guesses` |
| SPA fallback (`/login`, `/optimizer/abc`) | HTTP 200 con el HTML de la aplicación |
| Cache de `/assets/*` | `public, max-age=31536000, immutable` |
| Asset inexistente | HTTP **404** (antes devolvía 200 con HTML) |
| CSP | presente como `<meta>` en el HTML |
| `nosniff`, `X-Frame-Options`, `Referrer-Policy` | presentes |
| Credenciales de Supabase en el bundle | `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` presentes |
| `service_role` en el bundle | **ausente** |

Antes de esta corrección, la URL de producción servía el prototipo archivado. La causa no estaba
en el repositorio, sino en la configuración del proyecto de Vercel.

### Variables con prefijo incorrecto

Las variables deben llamarse `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Vite solo expone al
bundle las que comienzan con `VITE_`. Cualquier otra existe en el entorno del build, pero no llega
al código.

El proyecto de Supabase integrado con Vercel inyecta las suyas (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`, entre otras). Ninguna sirve para esta aplicación, y
varias no deben utilizarse en el cliente. La `SERVICE_ROLE_KEY` omite RLS por completo.

El síntoma de disponer solo de las variables incorrectas es silencioso. La aplicación compila,
carga y funciona en modo local con fixtures. No se produce error en ningún punto. La forma de
detectarlo consiste en buscar la URL del proyecto en el bundle publicado. Si no aparece, las
variables no llegaron.

### Alcance del target `build`

El target `build` de `apps/web` ejecuta solo `vite build` y no incluye `typecheck`. Vite omite los
errores de tipos y emite el bundle de todas formas. En consecuencia, un tipo mal escrito no
interrumpe el build de Vercel, pero falla en el navegador del usuario.

Por esta razón `main` exige CI en verde. El pipeline ejecuta `lint`, `typecheck`, las 700 pruebas y el build. Además aplica las verificaciones de calidad descritas en la sección siguiente.

## Cabeceras y SPA

`vercel.json` define rewrites y headers.

**Rewrites.** Solo las rutas sin extensión se reescriben a `/index.html`:

```json
{ "source": "/((?!.*\\..*).*)", "destination": "/index.html" }
```

La condición `(?!.*\.)` es determinante. Con un rewrite incondicional `/(.*)`, un asset inexistente
cae en el fallback y Vercel responde:

```
GET /assets/no-existe.js
  -> 200
  -> content-type: text/html
  -> cache-control: public, max-age=31536000, immutable
```

Es decir, se sirve HTML como si fuera un asset, con cache de un año por ser inmutable. La
consecuencia es concreta. Un cliente puede cargar un `index.html` cacheado que referencia un chunk antiguo. En ese caso, el 200 con HTML provoca que el navegador intente ejecutar HTML como JavaScript. El síntoma
en consola es `Unexpected token <`, y no se recupera hasta purgar la CDN.

Excluir las rutas con extensión hace que un asset faltante devuelva un 404, que el navegador
interpreta correctamente.

Ese 404 hereda el `cache-control` de `/assets/(.*)`, de modo que el navegador también lo almacena
un año. El impacto es bajo: un asset inexistente no aparecerá después. Si llegara a publicarse un chunk con ese nombre exacto, los clientes que ya almacenaron el 404 no lo verían. La corrección requeriría purgar la CDN. Se acepta el riesgo por dos razones. Reutilizar un nombre de archivo que ya falló es poco probable, y los nombres incluyen hash de contenido.

**Headers.** Se define cache inmutable de un año para `/assets/(.*)`, ya que los nombres incluyen
hash. Además se aplican `nosniff`, `Referrer-Policy` y `X-Frame-Options` en todas las respuestas.

El CSP no es un header. Se inyecta como `<meta>` en el `index.html` durante el build, mediante
`cspPlugin` en `apps/web/vite.config.mts`. Por esta razón se verifica en el HTML y no con
`curl -I`.

## Regla general

> Si un valor no puede ser público, no puede llevar prefijo `VITE_`.

Cualquier secreto real pertenece a una función del servidor o a un servicio externo. Nunca al
bundle del navegador.
