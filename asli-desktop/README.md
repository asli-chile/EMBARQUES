# ASLI Embarques — shell de escritorio (Tauri)

Contenedor Windows que abre el ERP web. **Sigues desarrollando solo la web**; este `.exe` casi no cambia.

| Qué | Dónde |
|-----|--------|
| ERP (producto) | `https://www.asli.cl/embarques/` — cada deploy actualiza a todos |
| Shell (este proyecto) | Ventana + auto-update del instalador |

## Requisitos

- [Rust](https://rustup.rs/) (estable)
- Node.js 20+
- Windows 10/11 con WebView2 (suele venir instalado)

## Desarrollo

Con el ERP en local (`npm run dev` en la raíz del monorepo, puerto 4321):

```bash
cd asli-desktop
npm install
npm run dev
```

Abre `http://localhost:4321/embarques`.

## Build del instalador

```bash
cd asli-desktop
npm run build
```

Salida típica:

- `src-tauri/target/release/bundle/nsis/ASLI Embarques_0.1.0_x64-setup.exe`
- artefactos de updater (`.sig` + JSON) si `createUpdaterArtifacts` está activo

### Firmar updates (obligatorio para auto-update)

La clave privada está en `keys/asli-desktop.key` (gitignored). En la máquina de build:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = (Resolve-Path .\keys\asli-desktop.key).Path
# si la clave tiene password:
# $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "..."
npm run build
```

Guarda un backup seguro de `asli-desktop.key`. Si la pierdes, los usuarios con el `.exe` antiguo no podrán actualizar el shell.

## Publicar una actualización del shell

1. Sube la versión en `src-tauri/tauri.conf.json` → `version` (y en `package.json` / `Cargo.toml` si aplica).
2. `npm run build` con la clave de firma.
3. Crea un **GitHub Release** en `asli-chile/EMBARQUES` y sube:
   - el instalador NSIS
   - `latest.json` (generado por Tauri; debe quedar accesible en  
     `https://github.com/asli-chile/EMBARQUES/releases/latest/download/latest.json`)
   - los `.sig` asociados
4. Al abrir, el `.exe` detecta la versión nueva y pide instalar.

Plantilla orientativa de `latest.json` (Tauri la genera; no inventes a mano salvo emergencia):

```json
{
  "version": "0.1.1",
  "notes": "Mejoras del contenedor de escritorio",
  "pub_date": "2026-09-07T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/asli-chile/EMBARQUES/releases/download/desktop-v0.1.1/ASLI.Embarques_0.1.1_x64-setup.nsis.zip"
    }
  }
}
```

## Scripts del monorepo

Desde la raíz:

```bash
npm run desktop:dev
npm run desktop:build
```

## Notas

- No empaquetamos el front del ERP dentro del `.exe`: un deploy web basta.
- El diálogo de actualización solo aparece en builds **release**.
- Firma Authenticode (SmartScreen) es independiente del updater de Tauri; conviene más adelante para no asustar a Windows.
