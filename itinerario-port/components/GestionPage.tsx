'use client';

import { useState } from 'react';
import ServiciosPorNaviera from './ServiciosPorNaviera';
import ConsorciosSection from './ConsorciosSection';

type Tab = 'servicios' | 'consorcios';

export default function GestionPage() {
  const [tab, setTab] = useState<Tab>('servicios');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('servicios')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'servicios'
              ? 'border-b-2 border-sky-600 text-sky-600 bg-white -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Servicios por naviera
        </button>
        <button
          type="button"
          onClick={() => setTab('consorcios')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'consorcios'
              ? 'border-b-2 border-sky-600 text-sky-600 bg-white -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Consorcios
        </button>
      </div>

      {tab === 'servicios' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <ServiciosPorNaviera />
        </div>
      )}
      {tab === 'consorcios' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <ConsorciosSection />
        </div>
      )}
    </div>
  );
}
