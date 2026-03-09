/**
 * API pública de itinerarios (sin auth)
 * Copiar a: src/pages/api/public/itinerarios.ts
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

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

export const GET: APIRoute = async () => {
  try {
    const admin = getAdminClient();
    const { data: itinerarios, error } = await admin
      .from('itinerarios')
      .select(`
        *,
        escalas:itinerario_escalas(id, itinerario_id, puerto, puerto_nombre, eta, dias_transito, orden, area, created_at, updated_at)
      `)
      .order('servicio', { ascending: true })
      .order('etd', { ascending: true });

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return json({ error: 'La tabla de itinerarios no existe.', code: 'TABLE_NOT_FOUND' }, 500);
      }
      return json({ error: error.message, code: error.code }, 400);
    }

    const serviciosMap = new Map<string, any[]>();
    (itinerarios || []).forEach((it: any) => {
      const key = it.servicio_id || it.servicio || 'sin-servicio';
      if (!serviciosMap.has(key)) serviciosMap.set(key, []);
      serviciosMap.get(key)!.push(it);
    });

    let servicioNavieraMap = new Map<string, string>();
    let consorcioNavierasMap = new Map<string, string[]>();

    try {
      const { data: serviciosUnicos } = await admin.from('servicios_unicos').select('id, naviera_id');
      if (serviciosUnicos?.length) {
        const navieraIds = [...new Set(serviciosUnicos.map((s: any) => s.naviera_id).filter(Boolean))];
        if (navieraIds.length) {
          const { data: navieras } = await admin.from('catalogos_navieras').select('id, nombre').in('id', navieraIds);
          const nm = new Map((navieras || []).map((n: any) => [n.id, n.nombre]));
          serviciosUnicos.forEach((s: any) => {
            if (s.naviera_id && nm.has(s.naviera_id)) servicioNavieraMap.set(s.id, nm.get(s.naviera_id)!);
          });
        }
      }

      const { data: consorcios } = await admin.from('consorcios').select('id, nombre');
      if (consorcios?.length) {
        const { data: cs } = await admin
          .from('consorcios_servicios')
          .select('consorcio_id, servicio_unico:servicios_unicos(naviera_id)')
          .in('consorcio_id', consorcios.map((c: any) => c.id))
          .eq('activo', true);
        if (cs?.length) {
          const navieraIdsSet = new Set<string>();
          cs.forEach((c: any) => {
            if (c.servicio_unico?.naviera_id) navieraIdsSet.add(c.servicio_unico.naviera_id);
          });
          if (navieraIdsSet.size) {
            const { data: navs } = await admin.from('catalogos_navieras').select('id, nombre').in('id', Array.from(navieraIdsSet));
            const navMap = new Map((navs || []).map((n: any) => [n.id, n.nombre]));
            consorcios.forEach((cons: any) => {
              const list: string[] = [];
              cs.filter((c: any) => c.consorcio_id === cons.id).forEach((c: any) => {
                const name = c.servicio_unico?.naviera_id && navMap.has(c.servicio_unico.naviera_id) ? navMap.get(c.servicio_unico.naviera_id)! : null;
                if (name && !list.includes(name)) list.push(name);
              });
              if (list.length) consorcioNavierasMap.set(cons.nombre, list.sort());
            });
          }
        }
      }
    } catch (_) {
      // Tablas de servicios/consorcios pueden no existir aún
    }

    const obtenerNavieras = (servicioNombre: string, servicioId: string | null): string[] => {
      if (servicioId && servicioNavieraMap.has(servicioId)) return [servicioNavieraMap.get(servicioId)!];
      if (consorcioNavierasMap.has(servicioNombre)) return consorcioNavierasMap.get(servicioNombre)!;
      return [];
    };

    const result = (itinerarios || []).map((it: any) => {
      const key = it.servicio_id || it.servicio || 'sin-servicio';
      const viajes = serviciosMap.get(key) || [];
      if (viajes.length === 0 || !it.escalas?.length) {
        return { ...it, navierasDelServicio: obtenerNavieras(it.servicio, it.servicio_id) };
      }
      const primerViaje = [...viajes].filter((v: any) => v.escalas?.length).sort((a: any, b: any) => (a.etd && b.etd ? new Date(a.etd).getTime() - new Date(b.etd).getTime() : 0))[0];
      if (!primerViaje?.escalas?.length) {
        return { ...it, navierasDelServicio: obtenerNavieras(it.servicio, it.servicio_id) };
      }
      const ordenPorPuerto = new Map<string, number>();
      [...primerViaje.escalas].sort((a: any, b: any) => (!a.eta && !b.eta ? (a.orden || 0) - (b.orden || 0) : !a.eta ? 1 : !b.eta ? -1 : new Date(a.eta).getTime() - new Date(b.eta).getTime())).forEach((e: any, i: number) => {
        ordenPorPuerto.set(e.puerto || e.puerto_nombre || '', i + 1);
      });
      const escalasOrdenadas = [...(it.escalas || [])].sort((a: any, b: any) => {
        const oa = ordenPorPuerto.get(a.puerto || a.puerto_nombre || '') ?? 999;
        const ob = ordenPorPuerto.get(b.puerto || b.puerto_nombre || '') ?? 999;
        return oa - ob;
      });
      return {
        ...it,
        escalas: escalasOrdenadas,
        navierasDelServicio: obtenerNavieras(it.servicio, it.servicio_id),
      };
    });

    return json({ success: true, itinerarios: result });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};
