/**
 * Descarga pública del PDF de itinerarios (misma ventana de semanas que el botón PDF del módulo).
 */
import type { APIRoute } from "astro";
import { createAnonClient } from "@/lib/supabase/admin";
import { loadPublicItinerariosWithEscalas } from "@/lib/itinerarios-public-query";
import { generateItinerarioPdfBuffer } from "@/lib/itinerario-pdf";
import { getISOWeek } from "@/lib/calendarUtils";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const supabase = createAnonClient();
    const result = await loadPublicItinerariosWithEscalas(supabase);
    if (!result.ok) {
      return new Response(result.message, {
        status: result.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const now = new Date();
    const startWeek = getISOWeek(now);
    const endWeek = startWeek + 3;

    const { buffer, filename } = await generateItinerarioPdfBuffer(
      result.itinerarios,
      "ALL",
      "es",
      { startWeek, endWeek },
    );

    const safeName = filename.replace(/[^\w.\-]+/g, "_");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar PDF";
    return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
};
