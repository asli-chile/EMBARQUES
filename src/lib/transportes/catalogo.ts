import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lleva al catálogo de la empresa de transporte los datos del chofer y del
 * camión que se escribieron en una reserva.
 *
 * El alta rápida desde el combobox crea el chofer (o el camión) con el nombre
 * (o la patente) apenas se sale del campo, antes de que se llenen RUT,
 * teléfono y remolque. Esos datos se escriben después y se guardaban solo en
 * la reserva: la próxima vez que se elegía al chofer, el RUT salía vacío.
 *
 * Se escribe solo lo que la reserva trae con valor y difiere del catálogo: un
 * campo vacío en el formulario nunca borra lo que el catálogo ya sabe.
 */

type ChoferCatalogo = { id: string; nombre: string; rut: string | null; telefono: string | null };
type EquipoCatalogo = { id: string; patente_camion: string; patente_remolque: string | null };

type DatosReserva = {
  chofer: string;
  rut_chofer: string;
  telefono_chofer: string;
  patente_camion: string;
  patente_remolque: string;
};

export type CambiosCatalogo = {
  chofer: { id: string; rut: string | null; telefono: string | null } | null;
  equipo: { id: string; patente_remolque: string | null } | null;
};

const igual = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export async function completarCatalogoTransporte(
  supabase: SupabaseClient,
  datos: DatosReserva,
  choferes: ChoferCatalogo[],
  equipos: EquipoCatalogo[],
): Promise<CambiosCatalogo> {
  const resultado: CambiosCatalogo = { chofer: null, equipo: null };

  const ch = datos.chofer.trim() ? choferes.find((c) => igual(c.nombre, datos.chofer)) : undefined;
  if (ch) {
    const patch: { rut?: string; telefono?: string } = {};
    if (datos.rut_chofer.trim() && !igual(ch.rut, datos.rut_chofer)) patch.rut = datos.rut_chofer.trim();
    if (datos.telefono_chofer.trim() && !igual(ch.telefono, datos.telefono_chofer)) patch.telefono = datos.telefono_chofer.trim();
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("transportes_choferes").update(patch).eq("id", ch.id);
      if (error) console.warn("No se pudo actualizar el chofer en el catálogo:", error.message);
      else resultado.chofer = { id: ch.id, rut: patch.rut ?? ch.rut, telefono: patch.telefono ?? ch.telefono };
    }
  }

  const eq = datos.patente_camion.trim() ? equipos.find((e) => igual(e.patente_camion, datos.patente_camion)) : undefined;
  if (eq && datos.patente_remolque.trim() && !igual(eq.patente_remolque, datos.patente_remolque)) {
    const patente_remolque = datos.patente_remolque.trim().toUpperCase();
    const { error } = await supabase.from("transportes_equipos").update({ patente_remolque }).eq("id", eq.id);
    if (error) console.warn("No se pudo actualizar el camión en el catálogo:", error.message);
    else resultado.equipo = { id: eq.id, patente_remolque };
  }

  return resultado;
}
