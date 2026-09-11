import { createWorker } from "tesseract.js";
import {
  mergeVesselTrackingOcr,
  parseVesselTrackingFromText,
  type VesselTrackingOcrFields,
} from "@/lib/vessel-tracking-parse";

export type { VesselTrackingOcrFields };

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
    await worker.setParameters({
      // Bloque de texto / tabla clave-valor
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
    });
    const parts: VesselTrackingOcrFields[] = [];
    const texts: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const result = await worker.recognize(file);
      const text = result.data.text ?? "";
      texts.push(text);
      parts.push(parseVesselTrackingFromText(text));
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
