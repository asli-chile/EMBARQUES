import { createWorker } from "tesseract.js";
import {
  mergeVesselTrackingOcr,
  parseVesselTrackingFromText,
  type VesselTrackingOcrFields,
} from "@/lib/vessel-tracking-parse";

export type { VesselTrackingOcrFields };

/** Amplía y pasa a escala de grises para mejorar dígitos pequeños (IMO). */
async function preprocessImage(file: Blob): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.max(2, Math.min(3, Math.ceil(900 / Math.max(bitmap.width, 1))));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(d[i]! * 0.299 + d[i + 1]! * 0.587 + d[i + 2]! * 0.114);
      // Contraste suave para texto oscuro sobre fondo claro
      const v = g < 140 ? Math.max(0, g - 20) : Math.min(255, g + 30);
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * OCR local (navegador) de una o más capturas de ficha/mapa AIS.
 */
export async function analyzeVesselTrackingImages(
  files: Array<Blob | File>,
  onProgress?: (pct: number) => void,
): Promise<{ text: string; fields: VesselTrackingOcrFields }> {
  if (files.length === 0) {
    throw new Error("No hay imágenes para analizar.");
  }

  const worker = await createWorker("eng", 1, {
    logger: () => undefined,
  });
  try {
    const parts: VesselTrackingOcrFields[] = [];
    const texts: string[] = [];
    // PSM 6 = bloque; PSM 4 = columna única (útil cuando lee etiquetas y luego valores)
    const modes = ["6", "4"] as const;

    for (let i = 0; i < files.length; i++) {
      const prepared = await preprocessImage(files[i]!);
      const modeTexts: string[] = [];
      for (const mode of modes) {
        await worker.setParameters({
          tessedit_pageseg_mode: mode,
          preserve_interword_spaces: "1",
        });
        const result = await worker.recognize(prepared);
        const text = (result.data.text ?? "").trim();
        if (text) modeTexts.push(text);
      }
      const combined = modeTexts.join("\n");
      texts.push(combined);
      // Parsea cada modo y fusiona (así no perdemos IMO de un layout)
      parts.push(
        mergeVesselTrackingOcr(modeTexts.map((t) => parseVesselTrackingFromText(t))),
      );
      onProgress?.(Math.round(((i + 1) / files.length) * 100));
    }

    return {
      text: texts.join("\n\n---\n\n"),
      fields: mergeVesselTrackingOcr(parts),
    };
  } finally {
    await worker.terminate();
  }
}
