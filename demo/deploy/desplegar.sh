#!/usr/bin/env bash
#
# Despliegue de Zenith por SSH
# ============================
# Se ejecuta desde TU maquina de desarrollo, no desde el servidor.
#
#   ./deploy/desplegar.sh
#   ZENITH_HOST=usuario@192.168.1.50 ./deploy/desplegar.sh
#
# Compila AQUI y manda solo el resultado. Es deliberado: compilar en el servidor
# obligaria a tener alli las 300 MB de node_modules del toolchain, y significaria
# que un fallo de compilacion se descubre en la maquina que estan mirando tus
# companeros en vez de en la tuya. Lo que viaja son ~1,5 MB de dist.
#
# Config por variables de entorno (o edita los valores de abajo):
#   ZENITH_HOST    usuario@host o el alias de tu ~/.ssh/config
#   ZENITH_DIR     ruta en el servidor
#   ZENITH_SERVICE nombre del servicio systemd

set -euo pipefail

HOST="${ZENITH_HOST:-zenith}"
DIR="${ZENITH_DIR:-~/zenith-demo}"
SERVICE="${ZENITH_SERVICE:-zenith}"

cd "$(dirname "$0")/.."

echo "▸ Comprobando tipos…"
npx tsc --noEmit

echo "▸ Verificando que el motor y el diagrama siguen de acuerdo…"
npx tsx scripts/grafo.ts

echo "▸ Validando las plantillas de ejemplo…"
npx tsx scripts/validar.ts > /dev/null

echo "▸ Compilando…"
npm run build

echo "▸ Enviando a $HOST:$DIR …"
# --delete borra en destino lo que ya no existe aqui: sin eso, los bundles
# viejos se acumulan para siempre en el servidor.
rsync -az --delete \
  --exclude node_modules --exclude .git \
  dist/ "$HOST:$DIR/dist/"

# El servidor y las unidades tambien, por si cambiaron.
rsync -az deploy/serve.mjs "$HOST:$DIR/deploy/serve.mjs"

echo "▸ Reiniciando el servicio…"
ssh "$HOST" "sudo systemctl restart $SERVICE && sleep 1 && systemctl is-active $SERVICE"

echo "▸ Comprobando que responde…"
ssh "$HOST" "curl -sf -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:4173/"

echo "✓ Desplegado."
