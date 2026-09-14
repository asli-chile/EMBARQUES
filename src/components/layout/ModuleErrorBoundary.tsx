import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@iconify/react";

type Props = {
  /** Ruta del módulo: si cambia, se vuelve a intentar sin recargar la página. */
  resetKey: string;
  children: ReactNode;
};

type State = { error: Error | null };

/**
 * Red bajo los módulos del ERP.
 *
 * React desmonta **todo** el árbol cuando un render lanza y nadie lo atrapa. Sin
 * esta barrera, un error en cualquier pantalla no dejaba un módulo roto: dejaba
 * la aplicación entera en blanco, sin header ni menú ni una palabra de qué
 * pasó. Eso se ve igual que "no cargó internet" y no hay por dónde empezar a
 * buscar.
 *
 * Acá el fallo queda contenido en el área del módulo: el chrome sigue en pie,
 * se puede ir a otra pantalla, y el mensaje trae el detalle técnico plegado
 * para poder copiarlo y pegarlo en un reporte.
 */
export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // La consola es lo único que queda cuando hay que diagnosticar a distancia.
    console.error("[ERP] módulo caído:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    // Navegar es el reintento natural: no hay que obligar a recargar.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main
        className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-[#050914] p-6"
        role="main"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-amber-300">
            <Icon icon="lucide:triangle-alert" width={22} height={22} aria-hidden />
          </span>
          <h1 className="text-lg font-bold text-white">No se pudo mostrar esta sección</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            El resto del sistema sigue funcionando: puedes ir a otra pantalla desde el menú.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/15"
            >
              <Icon icon="lucide:refresh-cw" width={16} height={16} aria-hidden />
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-white/65 transition-colors hover:text-white"
            >
              Recargar la página
            </button>
          </div>

          {/*
            * El detalle va plegado: no le sirve a quien solo quiere seguir
            * trabajando, y es exactamente lo que hace falta para arreglarlo.
            */}
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-[12px] font-semibold text-white/40 hover:text-white/70">
              Detalle técnico
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-white/55">
              {error.message}
              {error.stack ? `\n\n${error.stack.split("\n").slice(0, 6).join("\n")}` : ""}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}
