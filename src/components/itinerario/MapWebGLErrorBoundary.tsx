"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

/** Atrapa errores de WebGL (contexto no disponible, sandbox, etc.) y muestra fallback. */
export class MapWebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // WebGL no disponible (sandbox, vista previa del editor, etc.). No loguear el objeto de error para no saturar la consola.
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
