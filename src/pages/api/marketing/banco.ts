import type { APIRoute } from "astro";
import { requireSuperadmin } from "@/lib/auth/requireSuperadmin";

/**
 * Alta de imágenes en el banco del creador de publicidad.
 *
 * Va por el servidor y no directo desde el navegador a propósito: el bucket es
 * público solo de lectura, así que escribir exige la llave de servicio, que no
 * puede viajar al cliente. Acá además queda un solo lugar donde se revisa el
 * permiso y donde se actualiza el manifiesto.
 *
 * El navegador manda la imagen ya redimensionada como data URL; este endpoint
 * no reescala nada.
 */

const BUCKET = "marketing-banco";

type FotoBanco = {
  archivo: string;
  categoria: string;
  estado: "ok" | "revisar" | "vetada";
  nota?: string;
};

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** "banco/fotos/algo raro.JPG" → "algo-raro.jpg". */
function nombreSeguro(nombre: string, ext: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const sello = Date.now().toString(36);
  return `${base || "imagen"}-${sello}.${ext}`;
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) return json({ error: auth.error }, auth.status);
  const { admin } = auth;

  let cuerpo: { nombre?: string; categoria?: string; tipo?: string; dataUrl?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }

  const { nombre = "imagen", categoria = "otro", tipo = "foto", dataUrl } = cuerpo;
  if (!dataUrl || typeof dataUrl !== "string") {
    return json({ error: "Falta la imagen" }, 400);
  }
  if (tipo !== "foto" && tipo !== "logo" && tipo !== "correo") {
    return json({ error: "Tipo desconocido" }, 400);
  }

  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return json({ error: "Formato no admitido. Usa JPG, PNG o WebP." }, 400);
  const [, contentType, subtipo, base64] = m;

  const bytes = Buffer.from(base64, "base64");
  // 6 MB ya redimensionada es siempre un error de origen, no una foto legítima.
  if (bytes.length > 6 * 1024 * 1024) {
    return json({ error: "La imagen pesa demasiado" }, 413);
  }

  const ext = subtipo === "jpeg" ? "jpg" : subtipo;
  const archivo = nombreSeguro(nombre, ext);
  // Las piezas de correo van aparte: no son material del banco, son el
  // adjunto vivo de un envio y tienen que quedar en una URL estable.
  const carpeta = tipo === "logo" ? "logos" : tipo === "correo" ? "correos" : "fotos";

  const subida = await admin.storage.from(BUCKET).upload(`${carpeta}/${archivo}`, bytes, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (subida.error) return json({ error: subida.error.message }, 500);

  // El manifiesto solo lista fotos: los logos se descubren listando la carpeta.
  if (tipo === "foto") {
    const actual = await admin.storage.from(BUCKET).download("banco.json");
    if (actual.error) return json({ error: `No se pudo leer el manifiesto: ${actual.error.message}` }, 500);

    let manifiesto: { fotos: FotoBanco[] };
    try {
      manifiesto = JSON.parse(await actual.data.text());
    } catch {
      return json({ error: "El manifiesto está corrupto" }, 500);
    }

    // Nueva primero: es lo que la persona acaba de subir y quiere usar.
    manifiesto.fotos = [
      { archivo, categoria, estado: "ok", nota: "subida desde el creador" },
      ...(manifiesto.fotos ?? []),
    ];

    const guardado = await admin.storage
      .from(BUCKET)
      .update("banco.json", new Blob([JSON.stringify(manifiesto, null, 2)], { type: "application/json" }), {
        contentType: "application/json",
        cacheControl: "60",
        upsert: true,
      });
    if (guardado.error) return json({ error: guardado.error.message }, 500);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(`${carpeta}/${archivo}`);
  return json({ archivo, url: data.publicUrl, categoria, tipo });
};

/** Lista los logos subidos, para el selector de logo del evento. */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await requireSuperadmin(cookies);
  if (!auth.authorized) return json({ error: auth.error }, auth.status);
  const { admin } = auth;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .list("logos", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  if (error) return json({ error: error.message }, 500);

  const logos = (data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => ({
      archivo: f.name,
      url: admin.storage.from(BUCKET).getPublicUrl(`logos/${f.name}`).data.publicUrl,
    }));

  return json({ logos });
};
