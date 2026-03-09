/**
 * Plantilla API servicios-unicos para Astro
 * Copiar a: src/pages/api/admin/servicios-unicos.ts
 *
 * Requiere: output: 'server' o 'hybrid' en astro.config
 * Dependencias: createSupabaseServerClient, getAdminClient
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
// Desde src/pages/api/admin/servicios-unicos.ts → src/lib/supabase-server-astro.ts
import { createSupabaseServerClient } from '../../../lib/supabase-server-astro';

export const prerender = false;

const getAdminClient = () => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta configuración Supabase');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return jsonResponse({ error: 'No autenticado' }, 401);
    }

    const admin = getAdminClient();
    const { data: servicios, error: err } = await admin
      .from('servicios_unicos')
      .select('*')
      .order('nombre', { ascending: true });

    if (err) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return jsonResponse({
          error: 'La tabla servicios_unicos no existe. Ejecuta create-servicios-unicos-table.sql',
          code: 'TABLE_NOT_FOUND',
        }, 500);
      }
      return jsonResponse({ error: err.message }, 400);
    }

    // Enriquecer con navieras, naves, destinos (ver route.ts original)
    const navieraIds = [...new Set((servicios || []).map((s: any) => s.naviera_id).filter(Boolean))];
    const navierasMap: Record<string, any> = {};
    if (navieraIds.length > 0) {
      const { data: navieras } = await admin.from('catalogos_navieras').select('id, nombre').in('id', navieraIds);
      navieras?.forEach((n: any) => { navierasMap[n.id] = n; });
    }

    const serviciosConDetalles = await Promise.all(
      (servicios || []).map(async (s: any) => {
        const [navesRes, destinosRes] = await Promise.all([
          admin.from('servicios_unicos_naves').select('*').eq('servicio_unico_id', s.id).eq('activo', true).order('orden'),
          admin.from('servicios_unicos_destinos').select('*').eq('servicio_unico_id', s.id).eq('activo', true).order('orden'),
        ]);
        const nav = navierasMap[s.naviera_id];
        return {
          ...s,
          naviera: nav ? { id: nav.id, nombre: nav.nombre } : null,
          naviera_nombre: nav?.nombre || null,
          naves: navesRes.data || [],
          destinos: destinosRes.data || [],
        };
      })
    );

    return jsonResponse({ success: true, servicios: serviciosConDetalles });
  } catch (e: any) {
    return jsonResponse({ error: e?.message || 'Error inesperado' }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return jsonResponse({ error: 'No autenticado' }, 401);

    const body = await request.json();
    const { nombre, naviera_id, puerto_origen, naves, destinos } = body;

    if (!nombre?.trim()) return jsonResponse({ error: 'Nombre requerido' }, 400);
    if (!naviera_id) return jsonResponse({ error: 'Naviera requerida' }, 400);
    if (!naves?.length) return jsonResponse({ error: 'Al menos una nave' }, 400);
    if (!destinos?.length) return jsonResponse({ error: 'Al menos un destino' }, 400);
    if (!puerto_origen?.trim()) return jsonResponse({ error: 'Puerto de origen requerido' }, 400);

    const admin = getAdminClient();
    const { data: nuevo, error: insErr } = await admin
      .from('servicios_unicos')
      .insert({
        nombre: nombre.trim(),
        naviera_id,
        puerto_origen: puerto_origen.trim(),
        activo: true,
      })
      .select()
      .single();

    if (insErr || !nuevo) return jsonResponse({ error: insErr?.message }, 400);

    const navesToInsert = naves.map((n: string, i: number) => ({
      servicio_unico_id: nuevo.id,
      nave_nombre: (typeof n === 'string' ? n : n.nave_nombre || n).trim(),
      activo: true,
      orden: i,
    }));
    const destinosToInsert = destinos.map((d: any) => ({
      servicio_unico_id: nuevo.id,
      puerto: (d.puerto || d).trim(),
      puerto_nombre: d.puerto_nombre?.trim() || null,
      area: d.area || 'ASIA',
      orden: d.orden ?? 0,
      activo: true,
    }));

    await admin.from('servicios_unicos_naves').insert(navesToInsert);
    await admin.from('servicios_unicos_destinos').insert(destinosToInsert);

    return jsonResponse({ success: true, servicio: nuevo }, 201);
  } catch (e: any) {
    return jsonResponse({ error: e?.message || 'Error inesperado' }, 500);
  }
};

// PUT y DELETE: implementar según app/api/admin/servicios-unicos/route.ts original
