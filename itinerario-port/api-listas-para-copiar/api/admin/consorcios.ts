/**
 * API admin consorcios (GET lista)
 * Copiar a: src/pages/api/admin/consorcios.ts
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
    const { data: consorcios, error: err } = await admin
      .from('consorcios')
      .select('*')
      .order('nombre', { ascending: true });

    if (err) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return json({ error: 'La tabla consorcios no existe.', code: 'TABLE_NOT_FOUND' }, 500);
      }
      return json({ error: err.message }, 400);
    }

    const conDetalles = await Promise.all(
      (consorcios || []).map(async (c: any) => {
        const { data: cs } = await admin
          .from('consorcios_servicios')
          .select(`
            *,
            servicio_unico:servicios_unicos(*, naviera:naviera_id(id, nombre))
          `)
          .eq('consorcio_id', c.id)
          .eq('activo', true)
          .order('orden');

        const serviciosConNaves = await Promise.all(
          (cs || []).map(async (item: any) => {
            if (!item.servicio_unico) return item;
            const [navesRes, destinosRes] = await Promise.all([
              admin.from('servicios_unicos_naves').select('*').eq('servicio_unico_id', item.servicio_unico.id).eq('activo', true).order('orden'),
              admin.from('servicios_unicos_destinos').select('*').eq('servicio_unico_id', item.servicio_unico.id).eq('activo', true).order('orden'),
            ]);
            return {
              ...item,
              servicio_unico: {
                ...item.servicio_unico,
                naviera_nombre: item.servicio_unico?.naviera?.nombre || null,
                naves: navesRes.data || [],
                destinos: destinosRes.data || [],
              },
            };
          })
        );

        const { data: destinosActivos } = await admin
          .from('consorcios_destinos_activos')
          .select('*, destino:servicios_unicos_destinos(*)')
          .eq('consorcio_id', c.id)
          .eq('activo', true)
          .order('orden');

        return {
          ...c,
          servicios: serviciosConNaves,
          destinos_activos: destinosActivos || [],
        };
      })
    );

    return json({ success: true, consorcios: conDetalles });
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
    const { nombre, descripcion, servicios_unicos } = body;

    if (!nombre?.trim()) return json({ error: 'Nombre del consorcio requerido' }, 400);
    if (!servicios_unicos?.length) return json({ error: 'Al menos un servicio único' }, 400);

    const admin = getAdminClient();
    const ids = servicios_unicos.map((s: any) => s.servicio_unico_id);
    const { data: nuevos, error: insErr } = await admin
      .from('consorcios')
      .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null, activo: true })
      .select()
      .single();

    if (insErr || !nuevos) return json({ error: insErr?.message }, 400);

    const toInsert = ids.map((id: string, i: number) => ({
      consorcio_id: nuevos.id,
      servicio_unico_id: id,
      orden: i,
      activo: true,
    }));
    const { error: errRel } = await admin.from('consorcios_servicios').insert(toInsert);
    if (errRel) {
      await admin.from('consorcios').delete().eq('id', nuevos.id);
      return json({ error: errRel.message }, 400);
    }

    const { data: destinosDelServicio } = await admin.from('servicios_unicos_destinos').select('id, servicio_unico_id, orden').in('servicio_unico_id', ids).eq('activo', true).order('orden');
    if (destinosDelServicio?.length) {
      const destinosActivos = destinosDelServicio.map((d: any, i: number) => ({
        consorcio_id: nuevos.id,
        servicio_unico_id: d.servicio_unico_id,
        destino_id: d.id,
        activo: true,
        orden: i,
      }));
      await admin.from('consorcios_destinos_activos').insert(destinosActivos);
    }

    return json({ success: true, consorcio: nuevos }, 201);
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
    const { id, nombre, descripcion, servicios_unicos } = body;

    if (!id) return json({ error: 'ID requerido' }, 400);
    if (!nombre?.trim()) return json({ error: 'Nombre requerido' }, 400);
    if (!servicios_unicos?.length) return json({ error: 'Al menos un servicio único' }, 400);

    const admin = getAdminClient();
    await admin.from('consorcios').update({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null }).eq('id', id);
    await admin.from('consorcios_destinos_activos').delete().eq('consorcio_id', id);
    await admin.from('consorcios_servicios').delete().eq('consorcio_id', id);

    const ids = servicios_unicos.map((s: any) => s.servicio_unico_id);
    const toInsert = ids.map((idSu: string, i: number) => ({
      consorcio_id: id,
      servicio_unico_id: idSu,
      orden: i,
      activo: true,
    }));
    await admin.from('consorcios_servicios').insert(toInsert);

    const { data: destinosDelServicio } = await admin.from('servicios_unicos_destinos').select('id, servicio_unico_id, orden').in('servicio_unico_id', ids).eq('activo', true).order('orden');
    if (destinosDelServicio?.length) {
      const destinosActivos = destinosDelServicio.map((d: any, i: number) => ({
        consorcio_id: id,
        servicio_unico_id: d.servicio_unico_id,
        destino_id: d.id,
        activo: true,
        orden: i,
      }));
      await admin.from('consorcios_destinos_activos').insert(destinosActivos);
    }

    const { data: actualizado } = await admin.from('consorcios').select('*').eq('id', id).single();
    return json({ success: true, consorcio: actualizado });
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
    const { data: c, error: err } = await admin.from('consorcios').select('id').eq('id', id).single();
    if (err || !c) return json({ error: 'Consorcio no encontrado' }, 404);

    await admin.from('consorcios').delete().eq('id', id);
    return json({ success: true, message: 'Consorcio eliminado' });
  } catch (e: any) {
    return json({ error: e?.message || 'Error inesperado' }, 500);
  }
};
