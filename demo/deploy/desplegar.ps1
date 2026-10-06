# Despliegue de Zenith desde Windows
# ==================================
# Equivalente a desplegar.sh, pero sin bash y sin rsync: usa el cliente OpenSSH
# que Windows 10/11 ya trae de fabrica (ssh.exe y scp.exe). Si tienes WSL,
# desplegar.sh es mejor —rsync solo manda lo que cambio—, pero dist/ pesa ~1,5 MB
# y copiarlo entero tarda un par de segundos, asi que aqui no compensa complicarlo.
#
#   .\deploy\desplegar.ps1
#   .\deploy\desplegar.ps1 -RemoteHost usuario@192.168.1.50
#
# Si PowerShell se niega a ejecutar el script, es la politica de ejecucion:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

param(
  # 'zenith' es el alias de tu ~/.ssh/config. Ver README-despliegue.md.
  [string]$RemoteHost = $env:ZENITH_HOST,
  [string]$RemoteDir  = $(if ($env:ZENITH_DIR) { $env:ZENITH_DIR } else { "~/zenith-demo" }),
  [string]$Service    = $(if ($env:ZENITH_SERVICE) { $env:ZENITH_SERVICE } else { "zenith" }),
  # Salta las comprobaciones. Existe para una correccion urgente en mitad de una
  # demo; no lo uses por costumbre, que para eso estan las comprobaciones.
  [switch]$SinPruebas
)

$ErrorActionPreference = "Stop"
if (-not $RemoteHost) { $RemoteHost = "zenith" }

Set-Location (Join-Path $PSScriptRoot "..")

function Paso($t) { Write-Host "> $t" -ForegroundColor Cyan }
function Correr($cmd, $argumentos) {
  & $cmd @argumentos
  if ($LASTEXITCODE -ne 0) { throw "Fallo: $cmd $($argumentos -join ' ')" }
}

if (-not $SinPruebas) {
  Paso "Comprobando tipos..."
  Correr "npx" @("tsc", "--noEmit")

  Paso "Verificando que el motor y el diagrama siguen de acuerdo..."
  Correr "npx" @("tsx", "scripts/grafo.ts")

  Paso "Validando las plantillas de ejemplo..."
  Correr "npx" @("tsx", "scripts/validar.ts")
}

Paso "Compilando..."
Correr "npm" @("run", "build")

Paso "Enviando a ${RemoteHost}:${RemoteDir} ..."
# scp no tiene equivalente a --delete, asi que se vacia el destino primero. Sin
# esto, los bundles viejos (cada build genera nombres con hash nuevos) se
# acumularian en el servidor para siempre.
Correr "ssh" @($RemoteHost, "rm -rf $RemoteDir/dist && mkdir -p $RemoteDir/dist $RemoteDir/deploy")
Correr "scp" @("-q", "-r", "dist/*", "${RemoteHost}:$RemoteDir/dist/")
Correr "scp" @("-q", "deploy/serve.mjs", "${RemoteHost}:$RemoteDir/deploy/serve.mjs")

Paso "Reiniciando el servicio..."
Correr "ssh" @($RemoteHost, "sudo systemctl restart $Service && sleep 1 && systemctl is-active $Service")

Paso "Comprobando que responde..."
Correr "ssh" @($RemoteHost, "curl -sf -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:4173/")

Write-Host "OK. Desplegado." -ForegroundColor Green
