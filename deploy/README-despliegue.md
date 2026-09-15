# Poner Zenith en tu laptop-servidor

Zenith **no tiene backend**. El motor de optimización corre entero en el
navegador de quien lo usa: branch and bound, parser de fórmulas, Web Worker,
todo. El servidor no calcula nada — solo entrega archivos.

Eso simplifica el despliegue hasta lo absurdo (y también explica una cosa que
conviene saber antes de enseñárselo a nadie: ver *Lo que hay que decirles* al
final).

---

## Los cuatro pasos

### 1. En la laptop-servidor: dejar el proyecto y levantar el servicio

```bash
# Node 22 si no lo tienes
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs rsync

# Traer el proyecto (git, o rsync desde tu máquina)
git clone <tu-repo> ~/zenith-demo && cd ~/zenith-demo
npm ci && npm run build

# Instalar el servicio
bash deploy/instalar-servidor.sh
```

Al terminar tienes Zenith en `127.0.0.1:4173`, arrancando solo al encender la
laptop y reiniciándose si se cae.

Fíjate en el `127.0.0.1`: **no** en `0.0.0.0`. El servidor no escucha en la red;
solo el túnel puede llegar a él. Un servicio que solo escucha en loopback no se
puede atacar desde la wifi de la universidad.

### 2. En la laptop-servidor: el túnel

```bash
curl -L -o /tmp/cf.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cf.deb

cloudflared tunnel --url http://127.0.0.1:4173
```

Imprime una URL tipo `https://algo-random.trycloudflare.com`. Esa es la que
mandas al grupo. Funciona desde cualquier parte, con HTTPS, y **sin abrir un
solo puerto en el router**: la conexión la abre tu laptop hacia Cloudflare,
nunca al revés.

Sin cuenta, sin dominio, sin tarjeta. Para una demo de capstone es exactamente
lo que quieres.

**La pega:** la URL cambia cada vez que reinicias el túnel. Si te vale para la
sesión de prueba, quédate aquí. Si vas a estar semanas iterando, sigue leyendo.

### 3. Desde tu máquina Windows: conectarte por SSH

Windows 10 y 11 ya traen el cliente OpenSSH; no hace falta instalar PuTTY ni
nada. Todo esto es en **PowerShell**.

**Primero, en la laptop-servidor**, asegúrate de que acepta conexiones:

```bash
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
hostname -I          # anota la IP: algo como 192.168.1.50
```

**Ahora en Windows**, comprueba que llegas:

```powershell
ssh tu-usuario@192.168.1.50
```

La primera vez pregunta si confías en la huella del servidor — di `yes` — y
luego pide la contraseña. Si entra, ya está: el resto es comodidad.

#### Llave en vez de contraseña

Sin esto, cada despliegue te pide la contraseña tres veces (el script abre tres
conexiones). Con esto, ninguna.

```powershell
# 1. Crea el par de llaves (Enter en todo; la passphrase es opcional)
ssh-keygen -t ed25519

# 2. Copia la pública al servidor. Windows no trae ssh-copy-id, así que:
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh tu-usuario@192.168.1.50 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

La **privada** (`id_ed25519`, sin `.pub`) no sale nunca de tu máquina y no se
comparte con nadie, ni con tus compañeros.

#### El atajo `zenith`

Crea `C:\Users\TU_USUARIO\.ssh\config` (sin extensión) con:

```
Host zenith
    HostName 192.168.1.50
    User tu-usuario
    IdentityFile ~/.ssh/id_ed25519
```

Desde ahora `ssh zenith` basta, y es el nombre que usan los scripts de despliegue
por defecto.

#### Si la laptop-servidor cambia de IP

En una red con DHCP —la de la universidad, tu casa— la IP baila. Dos salidas:
reservar la IP en el router por MAC, o usar el nombre de la máquina
(`ssh tu-usuario@nombre-laptop.local`) si tenéis mDNS. La primera es más fiable.

### 4. Desde tu máquina: desplegar cambios

Con el atajo ya configurado, cada cambio es un comando:

```powershell
.\deploy\desplegar.ps1        # Windows (PowerShell)
```

```bash
./deploy/desplegar.sh          # WSL, Git Bash con rsync, Linux o macOS
```

Hay dos versiones porque `desplegar.sh` necesita bash y **rsync**, y Windows no
trae ninguno de los dos. La versión PowerShell usa `scp`, que sí viene incluido.
La diferencia práctica: rsync manda solo lo que cambió y `scp` copia `dist/`
entero — pero son ~1,5 MB, así que da igual. Si tienes WSL, usa la de bash.

Compila **en tu máquina**, comprueba tipos, verifica que el diagrama sigue de
acuerdo con el motor, valida las plantillas, y solo entonces manda ~1,5 MB de
`dist/` por rsync y reinicia el servicio.

Compilar en tu máquina y no en el servidor es deliberado: así el servidor no
necesita las 300 MB del toolchain, y un error de compilación lo descubres tú
antes de subir, no tus compañeros mientras miran la pantalla.

---

## URL estable (si vas a estar semanas con esto)

Necesitas una cuenta gratuita de Cloudflare y un dominio apuntado allí. Si
tienes uno, o si te sale a cuenta comprar uno de 2 USD:

```bash
cloudflared tunnel login              # abre el navegador
cloudflared tunnel create zenith
cloudflared tunnel route dns zenith zenith.tudominio.com
```

Crea `~/.cloudflared/config.yml`:

```yaml
tunnel: zenith
credentials-file: /home/TU_USUARIO/.cloudflared/<id-del-tunel>.json
ingress:
  - hostname: zenith.tudominio.com
    service: http://127.0.0.1:4173
  - service: http_status:404
```

Y lo dejas como servicio:

```bash
sudo cp deploy/zenith-tunnel.service /etc/systemd/system/
sudo sed -i "s/REEMPLAZA_USUARIO/$(whoami)/" /etc/systemd/system/zenith-tunnel.service
sudo systemctl daemon-reload && sudo systemctl enable --now zenith-tunnel
```

### La alternativa: Tailscale

Más simple de montar y la URL nunca cambia, **pero cada compañero tiene que
instalar Tailscale y entrar a tu red**. Para tres personas que ya trabajan
juntas, bien. Para "manda el link al grupo y que lo prueben", Cloudflare gana:
ellos solo abren un enlace.

---

## Lo que hay que decirles a tus compañeros

Esto no es opcional — sin avisar, van a reportar como bugs cosas que son el
diseño:

**El catálogo les va a aparecer vacío.** Cada persona tiene su propio
`localStorage`, así que cada uno importa los ejemplos y carga su propio GOOD.
No comparten inventario: no es un fallo, es que Zenith es offline-first y no
guarda nada en ningún servidor. Que cada uno empiece por *Juegos → importar
Genshin*.

**Si cambias la URL del túnel, pierden lo que tenían.** El `localStorage` va por
origen. Un `trycloudflare.com` nuevo es un origen nuevo, o sea un catálogo
vacío. Antes de rotar la URL, que exporten sus juegos desde *Mis juegos*
(el `.zenith.json` lleva plantilla, objetos y portada dentro) y los reimporten
después.

**El optimizador les puede tardar.** Con 2.600 artefactos y 6 ranuras el motor
tiene un límite de 30 segundos; si lo agota, avisa de que la build encontrada es
la mejor hallada pero no está demostrada como óptima. Es honesto, no es un
error. Si quieren el óptimo demostrado, que filtren el inventario por nivel al
importarlo o que añadan una restricción — restringir **acelera** la búsqueda.

---

## Comprobaciones rápidas

```bash
systemctl status zenith                 # ¿está vivo?
journalctl -u zenith -n 50 --no-pager   # ¿por qué no?
curl -sI http://127.0.0.1:4173/ | head -3
ss -tlnp | grep 4173                    # debe decir 127.0.0.1, no 0.0.0.0
```

Si la app carga pero **no calcula nada**, casi seguro es el tipo MIME de los
`.js`: el optimizador vive en un Web Worker de tipo módulo y el navegador
rechaza un módulo que no llegue como `text/javascript`. `deploy/serve.mjs` lo
hace bien; un `python3 -m http.server` no.

## Y si prefieres no montar servidor

`npm run build` genera un `dist/` completamente estático. Se arrastra tal cual a
Netlify Drop, Cloudflare Pages o GitHub Pages y queda publicado con URL estable
y sin mantener nada. La laptop-servidor tiene sentido si quieres controlar tú el
despliegue o enseñar la infraestructura como parte del capstone; para
simplemente compartir el enlace, un hosting estático es menos trabajo.
