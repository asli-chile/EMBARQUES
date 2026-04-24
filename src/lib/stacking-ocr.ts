import { parseStackingDatesFromText, type StackingFormFromOcr } from "@/lib/stacking-parse";

/**
 * Extrae texto con Docling vía endpoint backend (mantenemos auth/cookies del usuario).
 */
export async function extractTextFromStackingViaApi(imageUrl: string): Promise<string> {
  const response = await fetch("/api/ocr/stacking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; text?: string; message?: string }
    | null;

  if (!response.ok || !payload?.ok || typeof payload.text !== "string") {
    throw new Error(payload?.message || "No se pudo procesar la imagen con Docling.");
  }

  return payload.text;
}

/**
 * Analiza la imagen de stacking con Docling.
 */
export async function analyzeStackingImage(imageUrl: string): Promise<StackingFormFromOcr> {
  const text = await extractTextFromStackingViaApi(imageUrl);
  return parseStackingDatesFromText(text);
}
