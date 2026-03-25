"use client";
import { useAuth } from "@/lib/auth/AuthContext";
import { GenerarDocumentoContent } from "./GenerarDocumentoContent";

export function CrearInstructivoContent() {
  const { isSuperadmin, isAdmin, isEjecutivo, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isSuperadmin && !isAdmin && !isEjecutivo) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-500 p-8">
        <span className="text-4xl">🔒</span>
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Esta sección está disponible solo para ejecutivos, administradores y superadmin.</p>
      </div>
    );
  }

  return <GenerarDocumentoContent tipoDoc="instructivo" />;
}
