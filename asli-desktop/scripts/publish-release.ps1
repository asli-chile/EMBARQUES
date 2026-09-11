# Publica un release del shell desktop con artefactos de auto-update.
# Uso (desde asli-desktop/):
#   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password>"
#   .\scripts\publish-release.ps1
# Requiere: gh autenticado, keys/asli-desktop.key, npm/tauri.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$keyPath = Join-Path $root "keys\asli-desktop.key"
if (-not (Test-Path $keyPath)) {
  throw "Falta la clave privada: $keyPath"
}

$conf = Get-Content (Join-Path $root "src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
$version = $conf.version
$tag = "desktop-v$version"

Write-Host "Version: $version  Tag: $tag"

$key = Get-Content $keyPath -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $key
if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  throw "Define TAURI_SIGNING_PRIVATE_KEY_PASSWORD en el entorno antes de publicar."
}
Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue

Write-Host "Building (NSIS + updater artifacts)..."
npm run build

$nsisDir = Join-Path $root "src-tauri\target\release\bundle\nsis"
$setup = Get-ChildItem $nsisDir -Filter "*setup.exe" |
  Where-Object { $_.Name -notlike "*.sig" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $setup) { throw "No se encontro el instalador NSIS en $nsisDir" }

$sig = Get-Item ($setup.FullName + ".sig") -ErrorAction SilentlyContinue
if (-not $sig) { throw "No se encontro $($setup.Name).sig - revisa la firma updater" }

$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$cleanName = "ASLI-Embarques_$version`_x64-setup.exe"
$cleanPath = Join-Path $dist $cleanName
Copy-Item $setup.FullName $cleanPath -Force
Copy-Item $sig.FullName ($cleanPath + ".sig") -Force

$signature = (Get-Content ($cleanPath + ".sig") -Raw).Trim()
$assetUrl = "https://github.com/asli-chile/EMBARQUES/releases/download/$tag/$cleanName"
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$latestObj = [ordered]@{
  version  = $version
  notes    = "Actualizacion del acceso de escritorio ASLI Embarques."
  pub_date = $pubDate
  platforms = [ordered]@{
    "windows-x86_64" = [ordered]@{
      signature = $signature
      url       = $assetUrl
    }
  }
}
$latestPath = Join-Path $dist "latest.json"
$json = ($latestObj | ConvertTo-Json -Depth 6 -Compress)
[System.IO.File]::WriteAllText($latestPath, $json, [System.Text.UTF8Encoding]::new($false))

$notes = @"
Shell de escritorio $version.

Aviso de actualizacion con MessageBox de Windows (siempre visible).
Corrige el boton que no respondia en 0.1.10.
Al abrir, la ventana arranca maximizada.
"@

Write-Host "Creando release $tag..."
# Si el tag no existe, gh escribe en stderr y con Stop aborta el script.
$ErrorActionPreference = "Continue"
gh release delete $tag --yes --repo asli-chile/EMBARQUES 2>$null | Out-Null
$ErrorActionPreference = "Stop"
gh release create $tag `
  --repo asli-chile/EMBARQUES `
  --title "ASLI Embarques Desktop $version" `
  --notes $notes `
  --latest `
  $cleanPath `
  ($cleanPath + ".sig") `
  $latestPath

Write-Host "OK. Endpoint: https://github.com/asli-chile/EMBARQUES/releases/latest/download/latest.json"
Write-Host "Instalador: $cleanPath"
