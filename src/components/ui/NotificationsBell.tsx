import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNotifications, type Notificacion } from "@/lib/notifications/NotificationsContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const ICONO_POR_TIPO: Record<string, string> = {
  nueva_reserva:     "lucide:file-plus",
  nuevo_transporte:  "lucide:truck",
  facturacion:       "lucide:receipt",
  nueva_factura_ext: "lucide:file-text",
};

const COLOR_POR_TIPO: Record<string, string> = {
  nueva_reserva:     "bg-blue-100 text-blue-700",
  nuevo_transporte:  "bg-amber-100 text-amber-700",
  facturacion:       "bg-emerald-100 text-emerald-700",
  nueva_factura_ext: "bg-purple-100 text-purple-700",
};

function tiempoRelativo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

function NotificacionItem({
  n,
  onMarcarLeida,
}: {
  n: Notificacion;
  onMarcarLeida: (id: string) => void;
}) {
  const icono = ICONO_POR_TIPO[n.tipo] ?? "lucide:bell";
  const color = COLOR_POR_TIPO[n.tipo] ?? "bg-neutral-100 text-neutral-600";

  return (
    <button
      type="button"
      onClick={() => !n.leida && onMarcarLeida(n.id)}
      className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0 ${
        n.leida ? "opacity-60" : ""
      }`}
    >
      {/* Punto de no leído */}
      <div className="flex-shrink-0 mt-1 flex items-start gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 transition-opacity ${
            n.leida ? "opacity-0" : "bg-blue-500"
          }`}
        />
        <span className={`p-1.5 rounded-lg flex-shrink-0 ${color}`}>
          <Icon icon={icono} className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.leida ? "font-normal text-neutral-600" : "font-semibold text-neutral-800"}`}>
          {n.titulo}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{n.mensaje}</p>
        <p className="text-[11px] text-neutral-400 mt-1">{tiempoRelativo(n.created_at)}</p>
      </div>
    </button>
  );
}

export function NotificationsBell() {
  const { user, isEjecutivo, isAdmin, isSuperadmin } = useAuth();
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas } = useNotifications();
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [abierto]);

  // Solo visible para ejecutivo/admin/superadmin
  const canSeeNotificationsBell = Boolean(user) && (isEjecutivo || isAdmin || isSuperadmin);
  if (!canSeeNotificationsBell) return null;

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Botón campana */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 transition-colors"
      >
        <Icon icon="lucide:bell" className="w-[18px] h-[18px] text-neutral-500" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute right-0 top-10 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-neutral-200 z-[200] overflow-hidden animate-[modal-in_0.15s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bell" className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-semibold text-neutral-800">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={() => void marcarTodasLeidas()}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[420px]">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-neutral-400">
                <Icon icon="lucide:bell-off" className="w-8 h-8 opacity-40" />
                <span className="text-sm">Sin notificaciones</span>
              </div>
            ) : (
              notificaciones.map((n) => (
                <NotificacionItem
                  key={n.id}
                  n={n}
                  onMarcarLeida={(id) => void marcarLeida(id)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-2.5 border-t border-neutral-100 text-center">
              <span className="text-[11px] text-neutral-400">
                Últimas {notificaciones.length} notificaciones
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
