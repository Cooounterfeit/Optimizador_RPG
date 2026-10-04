#!/usr/bin/env bash
#
# Preparacion del servidor (se ejecuta UNA vez, EN la laptop servidor)
# ===================================================================
#
#   bash deploy/instalar-servidor.sh
#
# Deja el servicio corriendo en 127.0.0.1:4173 y arrancando solo al encender.
# El tunel se configura despues, a mano, porque requiere decisiones tuyas.

set -euo pipefail

USUARIO="$(whoami)"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Usuario: $USUARIO"
echo "▸ Proyecto: $DIR"

if ! command -v node > /dev/null; then
  echo "Falta Node. Instalalo con:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi
echo "▸ Node $(node -v)"

if [ ! -d "$DIR/dist" ]; then
  echo "▸ No hay dist/. Compilando aqui por esta vez…"
  ( cd "$DIR" && npm ci && npm run build )
fi

echo "▸ Instalando el servicio…"
sed -e "s|REEMPLAZA_USUARIO|$USUARIO|g" \
    -e "s|/home/$USUARIO/zenith-demo|$DIR|g" \
    "$DIR/deploy/zenith.service" | sudo tee /etc/systemd/system/zenith.service > /dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now zenith
sleep 1

if systemctl is-active --quiet zenith; then
  echo "✓ zenith activo en http://127.0.0.1:4173"
  curl -sf -o /dev/null -w "  respuesta: HTTP %{http_code}\n" http://127.0.0.1:4173/
else
  echo "✗ El servicio no arranco. Mira el motivo con:"
  echo "  journalctl -u zenith -n 40 --no-pager"
  exit 1
fi

cat <<'FIN'

Siguiente paso: el tunel, para que entren desde fuera.

  # 1. Instalar cloudflared
  curl -L -o /tmp/cf.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i /tmp/cf.deb

  # 2. Tunel rapido: una URL https al instante, sin cuenta ni dominio.
  #    Dejalo corriendo y comparte el enlace que imprime.
  cloudflared tunnel --url http://127.0.0.1:4173

Para una URL que no cambie, ver deploy/README-despliegue.md.
FIN
