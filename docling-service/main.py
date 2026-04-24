from __future__ import annotations

from tempfile import NamedTemporaryFile
from typing import Any
from urllib.parse import urlparse

import requests
from docling.document_converter import DocumentConverter
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="Docling OCR Service", version="1.0.0")
converter = DocumentConverter()


class ExtractStackingRequest(BaseModel):
    image_url: HttpUrl


def _validate_source_suffix(url: str) -> None:
    parsed = urlparse(url)
    lower_path = parsed.path.lower()
    allowed = (
        ".png",
        ".jpg",
        ".jpeg",
        ".tif",
        ".tiff",
        ".bmp",
        ".webp",
        ".pdf",
    )
    if not lower_path.endswith(allowed):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Usa imagen (.png/.jpg/.tiff/.webp) o PDF.",
        )


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.post("/extract-stacking")
def extract_stacking(payload: ExtractStackingRequest) -> dict[str, Any]:
    source_url = str(payload.image_url)
    _validate_source_suffix(source_url)

    try:
        with requests.get(source_url, timeout=30, stream=True) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            suffix = ".pdf" if "pdf" in content_type else ".png"

            with NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                for chunk in response.iter_content(chunk_size=1024 * 32):
                    if chunk:
                        tmp.write(chunk)
                tmp.flush()

                result = converter.convert(tmp.name)
                document = result.document
                text = document.export_to_text()
                markdown = document.export_to_markdown()

                return {
                    "ok": True,
                    "engine": "docling",
                    "text": text,
                    "markdown": markdown,
                }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo descargar el archivo: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error procesando documento con Docling: {exc}") from exc
