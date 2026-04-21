"""
Genera un PDF desde HTML.

- Intenta WeasyPrint (mejor CSS; en Windows suele requerir GTK, ver documentación).
- Si falla, usa xhtml2pdf (pip install xhtml2pdf), sin dependencias nativas extra.

Uso (desde la raíz del repo):
  py scripts/guia_nutricion_compra_abanilla_pdf.py
"""

import os
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = OUTPUT_DIR / "guia_nutricion_compra_abanilla_v1.pdf"


def _patch_md5_for_python38() -> None:
    """ReportLab 4.x usa md5(..., usedforsecurity=False); Python < 3.9 no lo admite."""
    if sys.version_info >= (3, 9):
        return
    import hashlib

    _orig = hashlib.md5

    def md5(*args, **kwargs):
        kwargs.pop("usedforsecurity", None)
        return _orig(*args, **kwargs)

    hashlib.md5 = md5  # type: ignore[assignment]


def write_pdf(html: str, path: Path) -> None:
    want_weasy = os.environ.get("USE_WEASYPRINT", "").strip().lower() in ("1", "true", "yes")
    try_weasy = want_weasy or sys.platform != "win32"

    if try_weasy:
        try:
            from weasyprint import HTML

            HTML(string=html).write_pdf(path)
            print("Motor: WeasyPrint")
            return
        except (OSError, ImportError):
            pass

    _patch_md5_for_python38()
    from xhtml2pdf import pisa

    with path.open("wb") as f:
        status = pisa.CreatePDF(html, dest=f)
    if status.err:
        raise RuntimeError("xhtml2pdf reportó errores al generar el PDF")
    hint = ""
    if sys.platform == "win32" and not want_weasy:
        hint = " (WeasyPrint: define USE_WEASYPRINT=1 tras instalar GTK, o usa Linux/macOS)"
    print(f"Motor: xhtml2pdf{hint}")

html_content = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Guía de Nutrición y Compra - Abanilla 3 Meses</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
            background-color: #f8fafc;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .container {
            padding: 20px;
        }
        .header {
            background-color: #0f172a;
            color: white;
            padding: 40px 30px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        h1 { margin: 0; font-size: 26pt; letter-spacing: -1px; }
        h2 {
            color: #0f172a;
            border-left: 5px solid #3b82f6;
            padding-left: 15px;
            margin-top: 40px;
            font-size: 18pt;
        }
        h3 { color: #2563eb; font-size: 14pt; margin-top: 25px; }

        .grid {
            display: block;
            margin-bottom: 20px;
        }

        .card {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .logistics-box {
            background-color: #dbeafe;
            border: 1px solid #3b82f6;
            padding: 15px;
            border-radius: 8px;
            font-size: 11pt;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
        }
        th {
            background-color: #334155;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 10pt;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10pt;
        }

        .tag {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .protein-callout {
            color: #dc2626;
            font-weight: bold;
        }

        .footer {
            text-align: center;
            font-size: 9pt;
            color: #64748b;
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>OPERATIVO ABANILLA 2024</h1>
        <p>Logística de Compra, Nutrición y Entrenamiento Muscular</p>
    </div>

    <div class="logistics-box">
        <strong>Contexto:</strong> Besfruit Coop (Abanilla). Trabajo en línea de packing (alto gasto calórico, muchas horas de pie). <br>
        <strong>Objetivo:</strong> Déficit calórico controlado + Mantenimiento de masa muscular (Proteína &gt; 1.8g/kg).
    </div>

    <h2>1. Logística: Compra en Alcampo</h2>
    <div class="card">
        <h3>Estrategia Alcampo Online (Recomendado)</h3>
        <p>Dado que estarás a 20 min caminando y no tienes coche, <strong>no cargues peso</strong>. La primera compra debe ser online a través de Alcampo.es.</p>
        <ul>
            <li><strong>Código Postal:</strong> Asegúrate de poner el de Abanilla (30640). El Alcampo que sirve la zona es el de Murcia (Thader).</li>
            <li><strong>Coste de envío:</strong> Aproximadamente 7-9€. Vale la pena para traer 20kg de comida y limpieza.</li>
            <li><strong>Frecuencia:</strong> Haz 1 compra grande al mes de productos pesados y no perecederos.</li>
        </ul>
    </div>

    <h2>2. Lista de Compra Detallada</h2>

    <h3>Bloque 1: Despensa Básica (Compra Mes 1 - Larga Duración)</h3>
    <table>
        <tr><th>Producto</th><th>Cantidad Sugerida</th><th>Propósito</th></tr>
        <tr><td>Arroz Integral / Quinoa</td><td>3 kg</td><td>Energía lenta para el turno.</td></tr>
        <tr><td>Avena en copos</td><td>2 kg</td><td>Desayuno saciante.</td></tr>
        <tr><td>Legumbres en bote (Lentejas/Garbanzos)</td><td>15 botes</td><td>Proteína barata y lista para comer.</td></tr>
        <tr><td>Atún al natural (Packs)</td><td>24 latas</td><td>Proteína rápida sin grasas.</td></tr>
        <tr><td>Aceite de Oliva Virgen Extra (AOVE)</td><td>2-3 Litros</td><td>Grasa saludable (medir con cuchara).</td></tr>
        <tr><td>Especias (Ajo, Cebolla en polvo, Curry, Sal)</td><td>Varios</td><td>Sabor sin añadir calorías.</td></tr>
        <tr><td>Café / Té</td><td>Gran formato</td><td>Cafeína para el turno de mañana.</td></tr>
    </table>

    <h3>Bloque 2: Reposición Semanal (Frescos y Proteína)</h3>
    <table>
        <tr><th>Producto</th><th>Cantidad Semanal</th><th>Notas</th></tr>
        <tr><td>Pechuga de Pollo / Pavo</td><td>1.5 kg</td><td>Cocinar y guardar (Batch Cooking).</td></tr>
        <tr><td>Huevos</td><td>2 docenas</td><td>La mejor fuente de proteína.</td></tr>
        <tr><td>Claras de Huevo (Bote)</td><td>2 botes (500ml)</td><td>Añadir volumen a comidas sin calorías.</td></tr>
        <tr><td>Queso Fresco Batido 0% / Yogur Griego Light</td><td>2 kg</td><td>Postre o snack proteico.</td></tr>
        <tr><td>Verduras Congeladas (Brócoli, Espinacas)</td><td>3-4 bolsas</td><td>Nutrientes sin riesgo de que se pudran.</td></tr>
        <tr><td>Fruta de Temporada</td><td>--</td><td><strong>Cómprala en Besfruit directamente.</strong></td></tr>
    </table>

    <div style="page-break-after: always;"></div>

    <h2>3. Plan de Comidas: "Packing Speed"</h2>

    <div class="card">
        <span class="tag">DÍAS DE TRABAJO (Rápido)</span>
        <h3>Almuerzo: El "Bowl de la Línea" (5 min)</h3>
        <p><strong>Preparación:</strong> 1 bote de legumbres escurrido + 2 latas de atún + pimientos de la cooperativa picados. Aliñar con vinagre y una gota de AOVE.</p>
        <p><span class="protein-callout">Proteína: ~45g</span> | Fibra alta para evitar hambre a mitad de turno.</p>
    </div>

    <div class="card">
        <span class="tag">DÍAS DE TRABAJO (Cena)</span>
        <h3>Revuelto Voluminoso de Claras (10 min)</h3>
        <p><strong>Preparación:</strong> Saltear una bolsa de espinacas congeladas. Añadir 2 huevos enteros + 200ml de claras. Acompañar con una patata pequeña cocida al microondas (7 min).</p>
        <p><span class="protein-callout">Proteína: ~40g</span> | Muy bajo en calorías, volumen alto para dormir saciado.</p>
    </div>

    <div class="card">
        <span class="tag">FIN DE SEMANA (Elaborado)</span>
        <h3>Pollo al Horno con Verdura de Abanilla</h3>
        <p><strong>Preparación:</strong> Cortar 1kg de pechuga en dados, mezclar con brócoli, pimientos y cebolla. Añadir especias y un chorrito de vino blanco o limón. Hornear 25 min a 200°C.</p>
        <p><strong>Tip:</strong> Cocina el domingo el doble de cantidad y congela en tuppers para el martes/miércoles.</p>
    </div>

    <h2>4. Consejos de Oro para el Déficit y el Músculo</h2>
    <ol>
        <li><strong>Hidratación con Electrolitos:</strong> En el packing sudarás. Añade un poco de sal a tu botella de agua para evitar calambres.</li>
        <li><strong>El truco del Microondas:</strong> Las patatas y el arroz "vasito" son tus mejores amigos cuando llegues cansado. 2 minutos y tienes carbohidratos de calidad.</li>
        <li><strong>Proteína Primero:</strong> En cada comida, empieza comiendo la carne/huevo/atún. Esto te saciará más rápido.</li>
        <li><strong>Aprovecha Besfruit:</strong> Al trabajar allí, tendrás acceso a la mejor fruta. Prioriza las manzanas y cítricos; son bajos en calorías y muy saciantes.</li>
    </ol>

    <div class="footer">
        Este documento es una guía base. Ajusta las porciones según tu peso y sensaciones de fatiga. <br>
        <strong>¡Mucho éxito en tu etapa en Abanilla!</strong>
    </div>
</div>

</body>
</html>
"""


def main() -> None:
    write_pdf(html_content, PDF_PATH)
    print(f"PDF generado: {PDF_PATH}")


if __name__ == "__main__":
    main()
