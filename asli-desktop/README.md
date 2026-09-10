# ASLI Embarques — shell de escritorio (Tauri)

Contenedor Windows que abre el ERP web. **Sigues desarrollando solo la web**; este `.exe` casi no cambia.

| Qué | Dónde |
|-----|--------|
| ERP (producto) | `https://www.asli.cl/embarques/` — cada deploy actualiza a todos |
| Shell (este proyecto) | Ventana + auto-update del instalador + inicio con Windows |

## Arranque con el sistema

Al abrir el `.exe` (release), se registra solo en el inicio de sesión de Windows
(`HKCU\...\Run` → «ASLI Embarques»). No hace falta marcar nada en el instalador.

Para quitarlo a mano: Configuración → Aplicaciones → Inicio, o
`Win+R` → `shell:startup` / editor del registro Run.

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
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .\keys\asli-desktop.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password de la clave>"
npm run build
# o publicar release completo:
.\scripts\publish-release.ps1
```

Guarda un backup seguro de `asli-desktop.key` **y** su password. Si los pierdes, los usuarios con el `.exe` antiguo no podrán actualizar el shell.

Endpoint configurado:

`https://github.com/asli-chile/EMBARQUES/releases/latest/download/latest.json`

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

## Barra de título integrada (v0.1.2+)

La ventana va **sin decoraciones nativas** de Windows. El header del ERP actúa como
barra de título (arrastrable) y muestra min/max/cerrar solo dentro del `.exe`.

Para mover la ventana o pasarla a otra pantalla: arrastra desde la barra superior
(zonas libres del header). Doble clic en la barra maximiza/restaura.

Orden seguro al publicar:

1. **Deploy del ERP web** (controles solo aparecen si detectan Tauri).
2. **Release del shell** con `decorations: false`.

Si publicas el shell antes que la web, la ventana quedaría sin botones de cerrar/minimizar hasta que el ERP se despliegue.

## Notas

- No empaquetamos el front del ERP dentro del `.exe`: un deploy web basta.
- El diálogo de actualización solo aparece en builds **release**.
- Firma Authenticode (SmartScreen) es independiente del updater de Tauri; conviene más adelante para no asustar a Windows.
