/**
 * API admin servicios únicos (GET lista; POST crea)
 * Copiar a: src/pages/api/admin/servicios-unicos.ts
 */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
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
    if (error || !user) return json({ error: 'No autenticado' }, 401);

    const admin = getAdminClient();
    const { data: servicios, error: err } = await admin
      .from('servicios_unicos')
      .select('*')
      .order('nombre', { ascending: true });

    if (err) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return json({ error: 'La tabla servicios_unicos no existe.', code: 'TABLE_NOT_FOUND' }, 500);
      }
      return json({ error: err.message }, 400);
    }

    const navieraIds = [...new Set((servicios || []).map((s: any) => s.naviera_id).filter(Boolean))];
    const navierasMap: Record<string, any> = {};
    if (navieraIds.length) {
      const { data: navieras } = await admin.from('catalogos_navieras').select('id, nombre').in('id', navieraIds);
      navieras?.forEach((n: any) => { navierasMap[n.id] = n; });
    }

    const conDetalles = await Promise.all(
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

    return json({ success: true, servicios: conDetalles });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'No autenticado' }, 401);

    const body = await request.json();
    const { nombre, naviera_id, puerto_origen, naves, destinos } = body;

    if (!nombre?.trim()) return json({ error: 'Nombre requerido' }, 400);
    if (!naviera_id) return json({ error: 'Naviera requerida' }, 400);
    if (!naves?.length) return json({ error: 'Al menos una nave' }, 400);
    if (!destinos?.length) return json({ error: 'Al menos un destino' }, 400);
    if (!puerto_origen?.trim()) return json({ error: 'Puerto de origen requerido' }, 400);

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

    if (insErr || !nuevo) return json({ error: insErr?.message }, 400);

    const navesToInsert = naves.map((n: string, i: number) => ({
      servicio_unico_id: nuevo.id,
      nave_nombre: (typeof n === 'string' ? n : (n as any).nave_nombre || n).trim(),
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

    return json({ success: true, servicio: nuevo }, 201);
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};

export const PUT: APIRoute = async ({ cookies, request }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'No autenticado' }, 401);

    const body = await request.json();
    const { id, nombre, naviera_id, puerto_origen, naves, destinos } = body;

    if (!id) return json({ error: 'ID requerido' }, 400);
    if (!nombre?.trim()) return json({ error: 'Nombre requerido' }, 400);
    if (!naviera_id) return json({ error: 'Naviera requerida' }, 400);
    if (!puerto_origen?.trim()) return json({ error: 'Puerto de origen requerido' }, 400);

    const admin = getAdminClient();
    const { data: existente, error: errExist } = await admin.from('servicios_unicos').select('id').eq('id', id).single();
    if (errExist || !existente) return json({ error: 'Servicio no encontrado' }, 404);

    await admin.from('servicios_unicos').update({
      nombre: nombre.trim(),
      naviera_id,
      puerto_origen: puerto_origen.trim(),
    }).eq('id', id);

    if (naves && Array.isArray(naves)) {
      await admin.from('servicios_unicos_naves').delete().eq('servicio_unico_id', id);
      if (naves.length) {
        await admin.from('servicios_unicos_naves').insert(
          naves.map((n: string, i: number) => ({
            servicio_unico_id: id,
            nave_nombre: (typeof n === 'string' ? n : (n as any).nave_nombre || n).trim(),
            activo: true,
            orden: i,
          }))
        );
      }
    }
    if (destinos && Array.isArray(destinos)) {
      await admin.from('servicios_unicos_destinos').delete().eq('servicio_unico_id', id);
      if (destinos.length) {
        await admin.from('servicios_unicos_destinos').insert(
          destinos.map((d: any) => ({
            servicio_unico_id: id,
            puerto: (d.puerto || d).trim(),
            puerto_nombre: d.puerto_nombre?.trim() || null,
            area: d.area || 'ASIA',
            orden: d.orden ?? 0,
            activo: true,
          }))
        );
      }
    }

    const { data: actualizado } = await admin.from('servicios_unicos').select('*').eq('id', id).single();
    return json({ success: true, servicio: actualizado });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies, request, url }) => {
  try {
    const supabase = createSupabaseServerClient({ cookies, request });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'No autenticado' }, 401);

    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'ID requerido' }, 400);

    const admin = getAdminClient();
    const { data: existente, error: errExist } = await admin.from('servicios_unicos').select('id').eq('id', id).single();
    if (errExist || !existente) return json({ error: 'Servicio no encontrado' }, 404);

    const { data: enConsorcio } = await admin.from('consorcios_servicios').select('consorcio_id').eq('servicio_unico_id', id).limit(1).maybeSingle();
    if (enConsorcio) return json({ error: 'No se puede eliminar: el servicio está en un consorcio. Desactívalo en su lugar.' }, 400);

    await admin.from('servicios_unicos').delete().eq('id', id);
    return json({ success: true, message: 'Servicio eliminado' });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};
