'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react';
import type { Consorcio, ConsorcioFormData, ServicioUnico } from '../types/servicios';

function getApiUrl(): string {
  return (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_API_URL) || '';
}

export default function ConsorciosSection() {
  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [serviciosUnicos, setServiciosUnicos] = useState<ServicioUnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Consorcio | null>(null);
  const [form, setForm] = useState<ConsorcioFormData>({
    nombre: '',
    descripcion: '',
    servicios_unicos: [],
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');

  async function loadConsorcios() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/consorcios`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar consorcios');
      setConsorcios(data.consorcios || []);
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  async function loadServicios() {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/servicios-unicos`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al cargar servicios');
      setServiciosUnicos(data.servicios || []);
    } catch (_) {}
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadConsorcios(), loadServicios()]).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', servicios_unicos: [] });
    setServicioSeleccionado('');
    setModalOpen(true);
  }

  function openEdit(c: Consorcio) {
    setEditing(c);
    const serviciosForm = (c.servicios || []).map((cs: any) => ({
      servicio_unico_id: cs.servicio_unico_id,
      orden: cs.orden ?? 0,
      destinos_activos: (c.destinos_activos || [])
        .filter((da: any) => da.servicio_unico_id === cs.servicio_unico_id)
        .map((da: any) => ({ destino_id: da.destino_id, orden: da.orden ?? 0 })),
    }));
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      servicios_unicos: serviciosForm,
    });
    setServicioSeleccionado('');
    setModalOpen(true);
  }

  function addServicio() {
    if (!servicioSeleccionado || form.servicios_unicos.some((s) => s.servicio_unico_id === servicioSeleccionado)) return;
    const s = serviciosUnicos.find((x) => x.id === servicioSeleccionado);
    if (!s) return;
    setForm({
      ...form,
      servicios_unicos: [
        ...form.servicios_unicos,
        {
          servicio_unico_id: servicioSeleccionado,
          orden: form.servicios_unicos.length,
          destinos_activos: (s.destinos || []).map((d: any, i: number) => ({ destino_id: d.id, orden: d.orden ?? i })),
        },
      ],
    });
    setServicioSeleccionado('');
  }

  function removeServicio(servicioUnicoId: string) {
    setForm({
      ...form,
      servicios_unicos: form.servicios_unicos.filter((s) => s.servicio_unico_id !== servicioUnicoId),
    });
  }

  async function save() {
    setError(null);
    setSuccess(null);
    if (!form.nombre.trim()) {
      setError('Nombre del consorcio requerido');
      return;
    }
    if (form.servicios_unicos.length === 0) {
      setError('Incluye al menos un servicio único');
      return;
    }
    try {
      const url = `${getApiUrl()}/api/admin/consorcios`;
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al guardar');
      setSuccess(editing ? 'Consorcio actualizado' : 'Consorcio creado');
      setModalOpen(false);
      loadConsorcios();
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este consorcio?')) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/consorcios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al eliminar');
      setSuccess('Consorcio eliminado');
      loadConsorcios();
    } catch (e: any) {
      setError(e?.message || 'Error');
    }
  }

  const disponibles = serviciosUnicos.filter(
    (s) => s.activo !== false && !form.servicios_unicos.some((su) => su.servicio_unico_id === s.id)
  );

  if (loading) return <p className="p-4 text-slate-500">Cargando consorcios...</p>;

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
        <h2 className="text-xl font-bold text-slate-800">Consorcios</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> Nuevo consorcio
        </button>
      </div>

      {consorcios.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          No hay consorcios. Crea uno con «Nuevo consorcio».
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {consorcios.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900">{c.nombre}</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                    aria-label="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">{c.servicios?.length || 0} servicio(s) en el consorcio</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar consorcio' : 'Nuevo consorcio'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del consorcio</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej: ANDES EXPRESS"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Servicios del consorcio</label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={servicioSeleccionado}
                    onChange={(e) => setServicioSeleccionado(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar servicio único</option>
                    {disponibles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.naviera_nombre || s.naviera_id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addServicio}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                  >
                    Añadir
                  </button>
                </div>
                <ul className="space-y-1">
                  {form.servicios_unicos.map((su) => {
                    const s = serviciosUnicos.find((x) => x.id === su.servicio_unico_id);
                    return (
                      <li
                        key={su.servicio_unico_id}
                        className="flex justify-between items-center rounded-lg bg-slate-50 px-2 py-1.5 text-sm"
                      >
                        <span>{s?.nombre ?? su.servicio_unico_id} {s?.naviera_nombre && <span className="text-slate-400">({s.naviera_nombre})</span>}</span>
                        <button
                          type="button"
                          onClick={() => removeServicio(su.servicio_unico_id)}
                          className="text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    );
                  })}
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
