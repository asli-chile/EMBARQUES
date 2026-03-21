import { Icon } from "@iconify/react";

type Variant = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES: Record<Variant, { icon: string; iconBg: string; iconColor: string; btnCls: string }> = {
  danger: {
    icon: "lucide:trash-2",
    iconBg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    btnCls: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: "lucide:alert-triangle",
    iconBg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    btnCls: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  default: {
    icon: "lucide:help-circle",
    iconBg: "bg-brand-blue/10 border-brand-blue/20",
    iconColor: "text-brand-blue",
    btnCls: "bg-brand-blue hover:bg-brand-blue/90 text-white",
  },
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const s = VARIANT_STYLES[variant];
  const resolvedIcon = icon ?? s.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 w-full max-w-sm animate-fade-in">
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${s.iconBg}`}>
            <Icon icon={resolvedIcon} width={20} height={20} className={s.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-900 leading-tight">{title}</h3>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${s.btnCls}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-xl hover:bg-neutral-200 transition-colors focus:outline-none"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
