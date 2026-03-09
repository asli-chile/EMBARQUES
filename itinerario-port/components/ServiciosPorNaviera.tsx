'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import type { ServicioUnico, ServicioUnicoFormData } from '../types/servicios';

const AREAS = ['ASIA', 'EUROPA', 'AMERICA', 'INDIA-MEDIOORIENTE'];

function getApiUrl(): string {
  return (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_API_URL) || '';
}

export default function ServiciosPorNaviera() {
  const [servicios, setServicios] = useState<ServicioUnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [navieras, setNavieras] = useState<Array<{ id: string; nombre: string }>>([]);
  const [pods, setPods] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServicioUnico | null>(null);
  const [form, setForm] = useState<ServicioUnicoFormData>({
    nombre: '',
    naviera_id: '',
    descripcion: '',
    puerto_origen: '',
    naves: [],
    destinos: [],
  });
  const [naveInput, setNaveInput] = useState('');
  const [destinoPuerto, setDestinoPuerto] = useState('');
  const [destinoArea, setDestinoArea] = useState('ASIA');

  async function loadServicios() {
    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/api/admin/servicios-unicos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar');
      setServicios(data.servicios || []);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogos() {
    try {
      const { createClient } = await import('../lib/supabase-browser');
      const supabase = createClient();
      const [navRes, destRes] = await Promise.all([
        supabase.from('catalogos_navieras').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('catalogos_destinos').select('nombre').eq('activo', true).order('nombre'),
      ]);
      if (navRes.data) setNavieras(navRes.data);
      if (destRes.data) setPods(destRes.data.map((d: any) => d.nombre).filter(Boolean));
    } catch (_) {
      setPods([]);
    }
  }

  useEffect(() => {
    loadServicios();
    loadCatalogos();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', naviera_id: '', descripcion: '', puerto_origen: '', naves: [], destinos: [] });
    setNaveInput('');
    setModalOpen(true);
  }

  function openEdit(s: ServicioUnico) {
    setEditing(s);
    setForm({
      nombre: s.nombre,
      naviera_id: s.naviera_id,
      descripcion: s.descripcion || '',
      puerto_origen: s.puerto_origen || '',
      naves: s.naves?.map((n: any) => n.nave_nombre) || [],
      destinos: (s.destinos || []).map((d: any) => ({
        puerto: d.puerto,
        puerto_nombre: d.puerto_nombre || d.puerto,
        area: d.area || 'ASIA',
        orden: d.orden ?? 0,
      })),
    });
    setModalOpen(true);
  }

  function addNave() {
    const n = naveInput.trim();
    if (n && !form.naves.includes(n)) {
      setForm({ ...form, naves: [...form.naves, n] });
      setNaveInput('');
    }
  }

  function removeNave(n: string) {
    setForm({ ...form, naves: form.naves.filter((x) => x !== n) });
  }

  function addDestino() {
    const p = destinoPuerto.trim();
    if (p) {
      setForm({
        ...form,
        destinos: [...form.destinos, { puerto: p, puerto_nombre: p, area: destinoArea, orden: form.destinos.length }],
      });
      setDestinoPuerto('');
    }
  }

  function removeDestino(i: number) {
    setForm({
      ...form,
      destinos: form.destinos.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, orden: idx })),
    });
  }

  async function save() {
    setError(null);
    setSuccess(null);
    if (!form.nombre.trim()) {
      setError('Nombre requerido');
      return;
    }
    if (!form.naviera_id) {
      setError('Selecciona una naviera');
      return;
    }
    if (!form.puerto_origen.trim()) {
      setError('Puerto de origen requerido');
      return;
    }
    if (form.naves.length === 0) {
      setError('Al menos una nave');
      return;
    }
    if (form.destinos.length === 0) {
      setError('Al menos un destino');
      return;
    }
    try {
      const url = `${getApiUrl()}/api/admin/servicios-unicos`;
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al guardar');
      setSuccess(editing ? 'Servicio actualizado' : 'Servicio creado');
      setModalOpen(false);
      loadServicios();
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/servicios-unicos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al eliminar');
      setSuccess('Servicio eliminado');
      loadServicios();
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  if (loading) return <p className="p-4 text-slate-500">Cargando servicios...</p>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <X className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Servicios por naviera</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> Nuevo servicio
        </button>
      </div>

      {servicios.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          No hay servicios. Crea uno con «Nuevo servicio».
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900">{s.nombre}</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                    aria-label="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">{s.naviera_nombre || s.naviera_id}</p>
              {s.puerto_origen && <p className="text-xs text-slate-600 mt-1">POL: {s.puerto_origen}</p>}
              <p className="text-xs text-slate-500 mt-1">
                {s.naves?.length || 0} naves · {s.destinos?.length || 0} destinos
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar servicio' : 'Nuevo servicio'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del servicio</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej: INCA, AX1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naviera</label>
                <select
                  value={form.naviera_id}
                  onChange={(e) => setForm({ ...form, naviera_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar naviera</option>
                  {navieras.map((n) => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Puerto de origen (POL)</label>
                <input
                  type="text"
                  value={form.puerto_origen}
                  onChange={(e) => setForm({ ...form, puerto_origen: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej: VALPARAISO"
                  list="pols-list"
                />
                {pods.length > 0 && (
                  <datalist id="pols-list">
                    {pods.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Naves</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={naveInput}
                    onChange={(e) => setNaveInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNave())}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Nombre de la nave"
                  />
                  <button type="button" onClick={addNave} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                    Añadir
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {form.naves.map((n) => (
                    <li key={n} className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2 py-1 text-xs">
                      {n}
                      <button type="button" onClick={() => removeNave(n)} className="hover:text-sky-600" aria-label="Quitar">×</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Destinos (PODs)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={destinoPuerto}
                    onChange={(e) => setDestinoPuerto(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDestino())}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Código puerto"
                    list="pods-list"
                  />
                  <select
                    value={destinoArea}
                    onChange={(e) => setDestinoArea(e.target.value)}
                    className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <button type="button" onClick={addDestino} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                    Añadir
                  </button>
                </div>
                {pods.length > 0 && (
                  <datalist id="pods-list">
                    {pods.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                )}
                <ul className="space-y-1">
                  {form.destinos.map((d, i) => (
                    <li key={i} className="flex justify-between items-center rounded-lg bg-slate-50 px-2 py-1.5 text-sm">
                      <span>{d.puerto} <span className="text-slate-400">({d.area})</span></span>
                      <button type="button" onClick={() => removeDestino(i)} className="text-red-600 hover:underline">Quitar</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
