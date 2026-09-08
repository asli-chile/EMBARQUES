import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useNeonTheme } from "@/lib/ui/neonTheme";
import { displayRefAsli } from "@/lib/refAsli";
import { Combobox } from "@/components/ui/Combobox";

export type ContenedorTransporteOp = {
  id: string;
  correlativo: number | null;
  ref_asli: string | null;
  cliente: string | null;
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
};

export type ContenedorTransporteSaved = {
  transporte: string | null;
  chofer: string | null;
  rut_chofer: string | null;
  telefono_chofer: string | null;
  patente_camion: string | null;
  patente_remolque: string | null;
  contenedor: string | null;
  sello: string | null;
  tara: number | null;
};

type Empresa = { id: string; nombre: string; rut: string | null };
type Chofer = { id: string; nombre: string; rut: string | null; telefono: string | null };
type Equipo = { id: string; patente_camion: string; patente_remolque: string | null };

type Props = {
  op: ContenedorTransporteOp;
  supabase: ReturnType<typeof createClient> | null;
  onClose: () => void;
  onSaved: (updated: ContenedorTransporteSaved) => void;
};

const FIELD =
  "dash-control w-full rounded-lg px-3.5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-dash-neon/40";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-dash-muted";
const SECTION_ICON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dash-neon/35 bg-dash-neon/15";

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ContenedorTransporteModal({ op, supabase, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const tr = t.misReservas;
  const [theme] = useNeonTheme();

  const [transporte, setTransporte] = useState(op.transporte ?? "");
  const [chofer, setChofer] = useState(op.chofer ?? "");
  const [rutChofer, setRutChofer] = useState(op.rut_chofer ?? "");
  const [telefonoChofer, setTelefonoChofer] = useState(op.telefono_chofer ?? "");
  const [patenteCamion, setPatenteCamion] = useState(op.patente_camion ?? "");
  const [patenteRemolque, setPatenteRemolque] = useState(op.patente_remolque ?? "");
  const [contenedor, setContenedor] = useState(op.contenedor ?? "");
  const [sello, setSello] = useState(op.sello ?? "");
  const [tara, setTara] = useState(op.tara != null ? String(op.tara) : "");

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [empresaId, setEmpresaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChoferesEquipos = useCallback(
    async (id: string) => {
      if (!supabase || !id) {
        setChoferes([]);
        setEquipos([]);
        return;
      }
      const [ch, eq] = await Promise.all([
        supabase
          .from("transportes_choferes")
          .select("id, nombre, rut, telefono")
          .eq("empresa_id", id)
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("transportes_equipos")
          .select("id, patente_camion, patente_remolque")
          .eq("empresa_id", id)
          .eq("activo", true)
          .order("patente_camion"),
      ]);
      setChoferes((ch.data ?? []) as Chofer[]);
      setEquipos((eq.data ?? []) as Equipo[]);
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setLoadingCatalog(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      const { data } = await supabase
        .from("transportes_empresas")
        .select("id, nombre, rut")
        .order("nombre");
      if (cancelled) return;
      const list = (data ?? []) as Empresa[];
      setEmpresas(list);
      const match = list.find((e) => e.nombre === (op.transporte ?? ""));
      if (match) {
        setEmpresaId(match.id);
        await loadChoferesEquipos(match.id);
      }
      setLoadingCatalog(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, op.transporte, loadChoferesEquipos]);

  const empresaOptions = useMemo(
    () =>
      empresas.map((e) => ({
        value: e.nombre,
        label: e.nombre,
        sublabel: e.rut || undefined,
      })),
    [empresas]
  );

  const choferOptions = useMemo(
    () =>
      choferes.map((c) => ({
        value: c.nombre,
        label: c.nombre,
        sublabel: c.rut || undefined,
      })),
    [choferes]
  );

  const equipoOptions = useMemo(
    () =>
      equipos.map((e) => ({
        value: e.patente_camion,
        label: e.patente_camion,
        sublabel: e.patente_remolque ? `Rampla: ${e.patente_remolque}` : undefined,
      })),
    [equipos]
  );

  const handleEmpresaChange = (value: string) => {
    setTransporte(value);
    const match = empresas.find((e) => e.nombre.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setEmpresaId(match.id);
      setChofer("");
      setRutChofer("");
      setTelefonoChofer("");
      setPatenteCamion("");
      setPatenteRemolque("");
      void loadChoferesEquipos(match.id);
    } else {
      setEmpresaId("");
      setChoferes([]);
      setEquipos([]);
    }
  };

  const handleChoferChange = (value: string) => {
    setChofer(value);
    const match = choferes.find((c) => c.nombre.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setRutChofer(match.rut ?? "");
      setTelefonoChofer(match.telefono ?? "");
    }
  };

  const handleEquipoChange = (value: string) => {
    const upper = value.toUpperCase();
    setPatenteCamion(upper);
    const match = equipos.find((e) => e.patente_camion.toLowerCase() === upper.trim().toLowerCase());
    if (match) {
      setPatenteRemolque(match.patente_remolque ?? "");
    }
  };

  const handleSave = async () => {
    if (!supabase) return;
    const contenedorTrim = contenedor.trim();
    if (!contenedorTrim) {
      setError(tr.containerRequired);
      return;
    }

    setSaving(true);
    setError(null);

    const taraNum = tara.trim() ? Number(tara.replace(",", ".")) : null;
    if (tara.trim() && (taraNum == null || Number.isNaN(taraNum))) {
      setError(tr.taraInvalid);
      setSaving(false);
      return;
    }

    const payload: ContenedorTransporteSaved = {
      transporte: emptyToNull(transporte),
      chofer: emptyToNull(chofer),
      rut_chofer: emptyToNull(rutChofer),
      telefono_chofer: emptyToNull(telefonoChofer),
      patente_camion: emptyToNull(patenteCamion.toUpperCase()),
      patente_remolque: emptyToNull(patenteRemolque.toUpperCase()),
      contenedor: contenedorTrim.toUpperCase(),
      sello: emptyToNull(sello),
      tara: taraNum,
    };

    const { error: updateError } = await supabase
      .from("operaciones")
      .update(payload)
      .eq("id", op.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    onSaved(payload);
    setSaving(false);
    onClose();
  };

  const isEdit = Boolean(op.contenedor);
  const refLabel = displayRefAsli(op.ref_asli, op.correlativo);

  return (
    <div
      className="dash-neon fixed inset-0 z-50 flex flex-col"
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contenedor-transporte-title"
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--dash-bg)]">
        {/* Header */}
        <header className="relative shrink-0 border-b border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_72%,transparent)] backdrop-blur-md">
          <div className="h-[3px] bg-gradient-to-r from-dash-neon via-dash-neon to-dash-neon-hot" />
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3.5">
              <button
                type="button"
                onClick={onClose}
                className="motion-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-control text-dash-muted hover:border-dash-neon/40 hover:text-dash-fg"
                aria-label={tr.close}
              >
                <Icon icon="lucide:arrow-left" width={18} height={18} />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id="contenedor-transporte-title" className="text-base font-bold tracking-tight text-dash-fg sm:text-lg">
                    {isEdit ? tr.editContainerModal : tr.addContainerModal}
                  </h3>
                  <span className="rounded-md border border-dash-neon/30 bg-dash-neon/10 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-dash-fg">
                    {refLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-dash-muted">
                  {op.cliente ?? "—"}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="dash-control px-4 py-2.5 text-xs font-semibold disabled:opacity-60"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loadingCatalog || !contenedor.trim()}
                className="dash-cta inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />
                    {tr.saving}
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:save" width={14} height={14} />
                    {tr.save}
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            {error && (
              <div className="motion-enter-lift flex items-start gap-2.5 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-xs font-medium text-dash-fg">
                <Icon icon="lucide:alert-circle" width={16} height={16} className="mt-0.5 shrink-0 text-red-400" />
                {error}
              </div>
            )}

            {loadingCatalog ? (
              <div className="dash-card flex items-center gap-3 rounded-xl p-6">
                <Icon icon="typcn:refresh" width={18} height={18} className="animate-spin text-dash-neon" />
                <p className="text-sm text-dash-muted">{tr.loadingCatalog}</p>
              </div>
            ) : (
              <div className="motion-stagger-group grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
                {/* Contenedor — hero */}
                <section className="dash-card overflow-hidden rounded-xl lg:col-span-2">
                  <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
                  <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3 sm:px-5">
                    <span className={SECTION_ICON}>
                      <Icon icon="typcn:box" className="h-4 w-4 text-dash-neon" />
                    </span>
                    <h2 className="text-base font-bold tracking-wide text-dash-fg">{tr.containerDataSection}</h2>
                  </div>
                  <div className="space-y-4 p-4 sm:p-5">
                    <div>
                      <label className={LABEL}>{tr.containerNumberLabel}</label>
                      <input
                        type="text"
                        value={contenedor}
                        onChange={(e) => setContenedor(e.target.value.toUpperCase())}
                        className={`${FIELD} font-mono text-lg tracking-wider`}
                        placeholder="ABCD1234567"
                        autoFocus={!isEdit}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL}>{tr.sealLabel}</label>
                        <input
                          type="text"
                          value={sello}
                          onChange={(e) => setSello(e.target.value)}
                          className={`${FIELD} font-mono`}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>{tr.tareLabel}</label>
                        <input
                          type="number"
                          lang="es-CL"
                          value={tara}
                          onChange={(e) => setTara(e.target.value)}
                          className={FIELD}
                          placeholder="kg"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Transporte */}
                <section className="dash-card overflow-hidden rounded-xl lg:col-span-3">
                  <div className="h-[3px] bg-gradient-to-r from-dash-neon to-dash-neon-hot" />
                  <div className="flex items-center gap-2.5 border-b border-dash-border px-4 py-3 sm:px-5">
                    <span className={SECTION_ICON}>
                      <Icon icon="lucide:truck" className="h-4 w-4 text-dash-neon" />
                    </span>
                    <h2 className="text-base font-bold tracking-wide text-dash-fg">{tr.transportDataSection}</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                    <div className="sm:col-span-2 xl:col-span-3">
                      <label className={LABEL}>{tr.transportCompanyLabel}</label>
                      <Combobox
                        neon
                        value={transporte}
                        onChange={handleEmpresaChange}
                        options={empresaOptions}
                        placeholder={tr.transportCompanyPlaceholder}
                        className={FIELD}
                        icon="lucide:building-2"
                      />
                    </div>
                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className={LABEL}>{tr.driverNameLabel}</label>
                      <Combobox
                        neon
                        value={chofer}
                        onChange={handleChoferChange}
                        options={choferOptions}
                        placeholder={tr.driverNamePlaceholder}
                        disabled={!empresaId && !transporte.trim()}
                        className={FIELD}
                        icon="lucide:user"
                      />
                    </div>
                    <div>
                      <label className={LABEL}>{tr.driverRutLabel}</label>
                      <input
                        type="text"
                        value={rutChofer}
                        onChange={(e) => setRutChofer(e.target.value)}
                        className={FIELD}
                        placeholder="12.345.678-9"
                      />
                    </div>
                    <div>
                      <label className={LABEL}>{tr.driverPhoneLabel}</label>
                      <input
                        type="tel"
                        value={telefonoChofer}
                        onChange={(e) => setTelefonoChofer(e.target.value)}
                        className={FIELD}
                        placeholder="+56 9 ..."
                      />
                    </div>
                    <div>
                      <label className={LABEL}>{tr.truckPlateLabel}</label>
                      <Combobox
                        neon
                        value={patenteCamion}
                        onChange={handleEquipoChange}
                        options={equipoOptions}
                        placeholder={tr.truckPlatePlaceholder}
                        disabled={!empresaId && !transporte.trim()}
                        className={FIELD}
                        icon="lucide:truck"
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <label className={LABEL}>{tr.trailerPlateLabel}</label>
                      <input
                        type="text"
                        value={patenteRemolque}
                        onChange={(e) => setPatenteRemolque(e.target.value.toUpperCase())}
                        className={`${FIELD} font-mono`}
                        placeholder="BB-BB-11"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Footer móvil */}
        <footer className="shrink-0 border-t border-dash-border bg-[color-mix(in_srgb,var(--dash-control)_85%,transparent)] px-4 py-3 backdrop-blur-md sm:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="dash-control flex-1 px-4 py-3 text-xs font-semibold disabled:opacity-60"
            >
              {tr.cancel}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loadingCatalog || !contenedor.trim()}
              className="dash-cta inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Icon icon="typcn:refresh" width={14} height={14} className="animate-spin" />
                  {tr.saving}
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" width={14} height={14} />
                  {tr.save}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
