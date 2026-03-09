/**
 * API admin de itinerarios (GET requiere auth; POST crea itinerario)
 * Copiar a: src/pages/api/admin/itinerarios.ts
 * Requiere: lib/supabase-server-astro.ts en src/lib/
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
// Ajusta la ruta según tu proyecto. Ej: @/lib/supabase-server-astro
import { createSupabaseServerClient } from '../../../lib/supabase-server-astro';

export const prerender = false;

function getAdminClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return json({ error: 'No autorizado' }, 401);
    }

    const admin = getAdminClient();
    const { data: itinerarios, error: err } = await admin
      .from('itinerarios')
      .select('*, escalas:itinerario_escalas(*)')
      .order('servicio', { ascending: true })
      .order('etd', { ascending: true });

    if (err) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return json({ error: 'La tabla de itinerarios no existe.', code: 'TABLE_NOT_FOUND' }, 500);
      }
      return json({ error: err.message }, 400);
    }

    const serviciosMap = new Map<string, any[]>();
    (itinerarios || []).forEach((it: any) => {
      const key = it.servicio_id || it.servicio || 'sin-servicio';
      if (!serviciosMap.has(key)) serviciosMap.set(key, []);
      serviciosMap.get(key)!.push(it);
    });

    const obtenerNavieras = async (servicioNombre: string, servicioId: string | null): Promise<string[]> => {
      if (servicioId) {
        const { data: su } = await admin.from('servicios_unicos').select('naviera_id').eq('id', servicioId).single();
        if (su?.naviera_id) {
          const { data: n } = await admin.from('catalogos_navieras').select('nombre').eq('id', su.naviera_id).single();
          if (n?.nombre) return [n.nombre];
        }
      }
      const { data: cons } = await admin.from('consorcios').select('id').eq('nombre', servicioNombre).single();
      if (cons?.id) {
        const { data: cs } = await admin.from('consorcios_servicios').select('servicio_unico:servicios_unicos(naviera_id)').eq('consorcio_id', cons.id).eq('activo', true);
        const ids = new Set((cs || []).map((c: any) => c.servicio_unico?.naviera_id).filter(Boolean));
        if (ids.size) {
          const { data: navs } = await admin.from('catalogos_navieras').select('nombre').in('id', Array.from(ids));
          return (navs || []).map((n: any) => n.nombre).sort();
        }
      }
      return [];
    };

    const result = await Promise.all(
      (itinerarios || []).map(async (it: any) => {
        const key = it.servicio_id || it.servicio || 'sin-servicio';
        const viajes = serviciosMap.get(key) || [];
        let escalas = it.escalas || [];
        if (viajes.length && escalas.length) {
          const primerViaje = [...viajes].filter((v: any) => v.escalas?.length).sort((a: any, b: any) => (a.etd && b.etd ? new Date(a.etd).getTime() - new Date(b.etd).getTime() : 0))[0];
          if (primerViaje?.escalas?.length) {
            const ordenPorPuerto = new Map<string, number>();
            [...primerViaje.escalas].sort((a: any, b: any) => (!a.eta && !b.eta ? (a.orden || 0) - (b.orden || 0) : !a.eta ? 1 : !b.eta ? -1 : new Date(a.eta).getTime() - new Date(b.eta).getTime())).forEach((e: any, i: number) => {
              ordenPorPuerto.set(e.puerto || e.puerto_nombre || '', i + 1);
            });
            escalas = [...escalas].sort((a: any, b: any) => {
              const oa = ordenPorPuerto.get(a.puerto || a.puerto_nombre || '') ?? 999;
              const ob = ordenPorPuerto.get(b.puerto || b.puerto_nombre || '') ?? 999;
              return oa - ob;
            });
          }
        }
        const navierasDelServicio = await obtenerNavieras(it.servicio, it.servicio_id);
        return { ...it, escalas, navierasDelServicio };
      })
    );

    return json({ success: true, itinerarios: result });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};

// POST: crear itinerario (misma lógica que en ASLI; aquí solo estructura mínima)
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'No autorizado' }, 401);

    const body = await request.json();
    const { nave, viaje, pol, etd, servicio, consorcio, escalas } = body;
    if (!nave || !viaje || !pol || !etd) {
      return json({ error: 'Faltan campos: nave, viaje, pol, etd' }, 400);
    }
    if (!escalas?.length) {
      return json({ error: 'Debe incluir al menos una escala' }, 400);
    }

    const admin = getAdminClient();
    const { data: nuevo, error: insErr } = await admin
      .from('itinerarios')
      .insert({
        servicio: servicio || 'Servicio',
        consorcio: consorcio ?? null,
        nave,
        viaje,
        pol,
        etd: new Date(etd).toISOString(),
        created_by: user.email,
        updated_by: user.email,
      })
      .select()
      .single();

    if (insErr || !nuevo) return json({ error: insErr?.message }, 400);

    const escalasToInsert = escalas.map((e: any, i: number) => ({
      itinerario_id: nuevo.id,
      puerto: e.puerto || '',
      puerto_nombre: e.puerto_nombre ?? null,
      eta: e.eta ? new Date(e.eta).toISOString() : null,
      dias_transito: e.dias_transito ?? null,
      orden: e.orden ?? i + 1,
      area: e.area || 'ASIA',
    }));
    const { error: errEsc } = await admin.from('itinerario_escalas').insert(escalasToInsert);
    if (errEsc) {
      await admin.from('itinerarios').delete().eq('id', nuevo.id);
      return json({ error: errEsc.message }, 400);
    }

    const { data: completo } = await admin.from('itinerarios').select('*, escalas:itinerario_escalas(*)').eq('id', nuevo.id).single();
    return json({ success: true, itinerario: completo || nuevo }, 201);
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};
