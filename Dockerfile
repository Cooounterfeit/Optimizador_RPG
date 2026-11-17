# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
# El motor de Zenith corre en el navegador: el build de Vite hornea el bundle
# con las variables de entorno dentro. Por eso las VITE_* son ARG de build y
# no secrets de runtime.
FROM node:22-alpine AS build

WORKDIR /app

ENV NX_DAEMON=false \
    CI=true

# El lockfile manda: solo se copian los manifiestos primero para aprovechar la
# cache de capas cuando cambia el codigo pero no las dependencias.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/web-e2e/package.json apps/web-e2e/
COPY libs/core-engine/package.json libs/core-engine/
COPY libs/data-access/package.json libs/data-access/
COPY libs/inventory/package.json libs/inventory/
COPY libs/shared-types/package.json libs/shared-types/

# Mismo comando que el CI, para que el build local y el de Docker no divergan.
# Sin --ignore-scripts: esbuild resuelve su binario nativo en el postinstall.
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_USE_MOCKS=""

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_USE_MOCKS=$VITE_USE_MOCKS

RUN npx nx build web

# ---- runtime ---------------------------------------------------------------
# La app es estatica: nginx sirve el bundle y resuelve el fallback de SPA.
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx:alpine trae wget de busybox, que no soporta --spider en todas sus
# versiones. Peticion real descartando la salida: falla si no responde 200.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
