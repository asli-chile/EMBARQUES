# Docling Service (OCR / Parsing)

Microservicio Python para extraer texto desde imágenes/PDF de stacking usando Docling.

## Requisitos

- Python 3.11+ (recomendado 3.12)
- `pip`

## Ejecución local

```bash
cd docling-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

```bash
cd docling-service
docker build -t embarques-docling .
docker run --rm -p 8000:8000 embarques-docling
```

## Deploy en Railway

1. Crear proyecto nuevo en Railway desde este repo.
2. Configurar `Root Directory` en `docling-service`.
3. Railway construye con el `Dockerfile` de esta carpeta.
4. Generar dominio público del servicio.
5. Probar `GET /health` en la URL pública.

Nota: el contenedor ya soporta puerto dinámico de Railway usando `PORT`.

## Endpoints

- `GET /health` -> health check
- `POST /extract-stacking` -> extrae texto y markdown

## Seguridad (recomendado para producción)

- Definir variable de entorno `DOCLING_API_KEY` en el servicio Docling.
- En el ERP (Vercel), usar la misma clave en `DOCLING_API_KEY`.
- El endpoint `/extract-stacking` valida el header `x-docling-api-key` cuando la variable está definida.

Body:

```json
{
  "image_url": "https://.../stacking.png"
}
```

Respuesta:

```json
{
  "ok": true,
  "engine": "docling",
  "text": "...",
  "markdown": "..."
}
```
