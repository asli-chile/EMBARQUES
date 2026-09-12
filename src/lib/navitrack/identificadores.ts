/**
 * Alta automática de las naves que aparecen por transbordo.
 *
 * Cuando se declara un transbordo, el buque siguiente suele ser uno del que el
 * ERP nunca supo nada: no está en el catálogo `naves` o está sin IMO. Hasta
 * ahora eso dejaba la carga sin seguimiento hasta que alguien se diera cuenta y
 * apretara un botón, y nadie se daba cuenta.
 *
 * Esto lo resuelve en la siguiente corrida programada: da de alta la nave si
 * falta y le busca el IMO al proveedor. El gasto es razonable porque **se deja
 * de consultar al buque anterior**: la carga no se sigue dos veces.
 *
 * Dos reglas que no se negocian:
 *
 * - **El nombre tiene que calzar.** Un parecido llevaría a seguir otro barco, y
 *   una posición real de la nave equivocada es peor que ninguna posición. En
 *   este proyecto ya pasó: siete WAN HAI distintas terminaron con el mismo IMO.
 * - **Una búsqueda por nave cada varios días**, con tope por corrida. Si el
 *   proveedor no la encuentra hoy, tampoco la encontrará mañana: sin esta
 *   espera, una nave que el proveedor no conoce costaría un crédito diario para
 *   siempre, en silencio.
 */

const DATADOCKED_BASE = "https://datadocked.com/api/vessels_operations";
/** Días de espera antes de volver a preguntar por una nave que no se encontró. */
const REINTENTO_DIAS = 7;

type Cliente = { from: (tabla: string) => any };

export type AltaNave = {
  nombre: string;
  /** Quedó con identificador y se puede seguir. */
  resuelta: boolean;
  imo: string | null;
  mmsi: string | null;
  /** Por qué no se pudo, cuando no se pudo. */
  motivo: string | null;
};

/** Nombre comparable, con los separadores del proveedor unificados. */
function claveNave(raw: string | null | undefined): string {
  let s = String(raw ?? "")
    .toUpperCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/\s*\[[^\]]*\]\s*$/, "").trim();
  const ultimo = s.split(" ").pop() ?? "";
  if (/\d/.test(ultimo) && /[A-Z]/.test(ultimo) && ultimo.length <= 5 && s.split(" ").length > 1) {
    s = s.slice(0, s.length - ultimo.length).trim();
  }
  return s;
}

/**
 * Resuelve el IMO de las naves indicadas y las deja listas para seguir.
 *
 * `nombres` son naves que llevan carga pero no se pueden consultar. Por cada
 * una: se crea la fila en `naves` si no existe, se busca su identificador
 * (1 crédito) y, si aparece, se habilita el rastreo.
 */
export async function resolverNavesSinIdentificador(
  supabase: Cliente,
  apiKey: string | undefined,
  nombres: string[],
  maximo = 3,
): Promise<AltaNave[]> {
  if (!apiKey || !nombres.length) return [];

  const salida: AltaNave[] = [];

  for (const nombre of nombres.slice(0, maximo)) {
    const clave = claveNave(nombre);
    if (!clave) continue;

    // ¿Ya existe en el catálogo?
    const { data: existentes } = await supabase
      .from("naves")
      .select("id, nombre, imo, mmsi")
      .ilike("nombre", nombre);

    let fila = (existentes ?? [])[0] as
      | { id: string; nombre: string; imo: string | null; mmsi: string | null }
      | undefined;

    if (!fila) {
      // Alta mínima: el nombre viene del tramo, que lo escribió una persona.
      const { data: creada } = await supabase
        .from("naves")
        .insert({ nombre, activo: true, modo_transporte: "maritimo", tracking_activo: false })
        .select("id, nombre, imo, mmsi")
        .single();
      fila = creada ?? undefined;
      if (!fila) {
        salida.push({ nombre, resuelta: false, imo: null, mmsi: null, motivo: "no se pudo dar de alta" });
        continue;
      }
    }

    /*
     * ¿Ya se preguntó por esta nave hace poco?
     *
     * Cada búsqueda deja su fila con tipo "busqueda". Si hay una reciente, se
     * salta: repetir la misma consulta fallida todos los días es la forma más
     * tonta de quedarse sin créditos.
     */
    const desde = new Date(Date.now() - REINTENTO_DIAS * 86_400_000).toISOString();
    const { data: intentos } = await supabase
      .from("navitrack_ais_lecturas")
      .select("consultado_at")
      .eq("nave_id", fila.id)
      .eq("tipo", "busqueda")
      .gte("consultado_at", desde)
      .limit(1);

    if ((intentos ?? []).length > 0 && !(fila.imo ?? "").trim() && !(fila.mmsi ?? "").trim()) {
      salida.push({
        nombre,
        resuelta: false,
        imo: null,
        mmsi: null,
        motivo: `ya se buscó hace poco; se reintenta en ${REINTENTO_DIAS} días`,
      });
      continue;
    }

    if ((fila.imo ?? "").trim() || (fila.mmsi ?? "").trim()) {
      // Ya tenía identificador: solo faltaba habilitarla.
      await supabase.from("naves").update({ tracking_activo: true }).eq("id", fila.id);
      salida.push({ nombre, resuelta: true, imo: fila.imo, mmsi: fila.mmsi, motivo: null });
      continue;
    }

    let imo: string | null = null;
    let mmsi: string | null = null;
    let motivo: string | null = null;

    try {
      const r = await fetch(
        `${DATADOCKED_BASE}/vessels-by-vessel-name?name=${encodeURIComponent(clave)}`,
        { headers: { "x-api-key": apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) },
      );

      // El crédito se gasta apenas responde, haya match o no: queda registrado.
      await supabase.from("navitrack_ais_lecturas").insert({
        identificador: clave.slice(0, 60),
        nave_id: fila.id,
        nave_nombre: fila.nombre,
        tipo: "busqueda",
        origen: "cron",
      });

      if (!r.ok) {
        motivo = r.status === 403 ? "sin créditos" : "el proveedor no respondió";
      } else {
        const data = (await r.json()) as unknown;
        // El proveedor responde { total, items: [...] }. Se aceptan las otras
        // formas por si cambia, pero `items` es la que devuelve de verdad.
        const lista = Array.isArray(data)
          ? data
          : ((data as Record<string, unknown>)?.items ??
              (data as Record<string, unknown>)?.detail ??
              (data as Record<string, unknown>)?.data ??
              (data as Record<string, unknown>)?.vessels ??
              []);
        const items = (Array.isArray(lista) ? lista : [lista]) as Record<string, unknown>[];

        /*
         * Elegir el identificador.
         *
         * El proveedor puede devolver varias fichas del mismo barco: MSC RITA V
         * aparece dos veces con el mismo IMO 9313929 y dos MMSI distintos, uno
         * por cada registro histórico de bandera.
         *
         * El IMO se asigna al casco y no cambia nunca; el MMSI acompaña a la
         * matrícula y cambia con ella. Por eso ante discrepancia se guarda solo
         * el IMO: un MMSI viejo devolvería la posición de otro barco, o de
         * ninguno, con toda la apariencia de ser correcta.
         */
        const candidatos = items.filter(
          (v) => v && typeof v === "object" && claveNave(String(v.name ?? "")) === clave,
        );

        const imos = new Set(
          candidatos.map((v) => String(v.imo ?? "").replace(/\D/g, "")).filter((x) => /^\d{7}$/.test(x)),
        );
        const mmsis = new Set(
          candidatos.map((v) => String(v.mmsi ?? "").replace(/\D/g, "")).filter((x) => /^\d{9}$/.test(x)),
        );

        if (imos.size === 1) imo = [...imos][0];
        // Solo si no hay dudas: con dos matrículas no se puede saber cuál rige.
        if (mmsis.size === 1) mmsi = [...mmsis][0];

        if (!imo && !mmsi) {
          motivo = candidatos.length
            ? "el proveedor devolvió datos contradictorios"
            : "el proveedor no la encontró por ese nombre";
        }
      }
    } catch {
      motivo = "no se pudo conectar con el proveedor";
    }

    if (imo || mmsi) {
      const cambios: Record<string, unknown> = { tracking_activo: true };
      if (imo) cambios.imo = imo;
      if (mmsi) cambios.mmsi = mmsi;
      await supabase.from("naves").update(cambios).eq("id", fila.id);
    }

    salida.push({ nombre, resuelta: Boolean(imo || mmsi), imo, mmsi, motivo });
  }

  return salida;
}
