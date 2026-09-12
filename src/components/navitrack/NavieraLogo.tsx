"use client";

import { useState } from "react";

/**
 * Marca de la naviera.
 *
 * Si `navieras.logo_url` tiene una imagen, se usa. Si no —que hoy es el caso de
 * casi todas— se dibuja un monograma con las iniciales y un color estable
 * derivado del nombre. Así la cabecera nunca queda con un hueco ni con un ícono
 * genérico repetido, y el color ayuda a reconocer la naviera de un vistazo.
 *
 * El tono se pasa como `--nv-hue` y `navitrack.css` lo convierte en color según
 * el tema: fijar el color acá congelaría el aspecto de uno solo de los dos.
 */

/** Hash estable del nombre a un tono (0-359). Misma naviera, siempre mismo color. */
function hueDeNombre(nombre: string): number {
  let h = 0;
  for (let i = 0; i < nombre.length; i += 1) {
    h = (h * 31 + nombre.charCodeAt(i)) % 360;
  }
  // Se evita la franja 45-70 (amarillos), que en ambos temas se lee como alerta.
  return h >= 45 && h <= 70 ? (h + 120) % 360 : h;
}

/**
 * Monograma del nombre: "MSC" → MSC, "HAPAG-LLOYD" → HL, "WAN HAI" → WH.
 *
 * Las navieras de una sola palabra corta (MSC, ZIM, ONE, PIL, OOCL) se muestran
 * completas: recortarlas a dos letras las vuelve irreconocibles. Las compuestas
 * van con la inicial de cada palabra.
 */
function iniciales(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/[\s.\-/]+/)
    .filter((p) => /[a-zA-Z0-9]/.test(p));
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) {
    const u = palabras[0].toUpperCase();
    return u.length <= 4 ? u : u.slice(0, 2);
  }
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

type NavieraLogoProps = {
  nombre: string | null;
  logoUrl?: string | null;
  /** Lado del cuadrado en px. */
  size?: number;
};

export function NavieraLogo({ nombre, logoUrl, size = 44 }: NavieraLogoProps) {
  const [falloImagen, setFalloImagen] = useState(false);
  const limpio = (nombre ?? "").trim();
  if (!limpio) return null;

  const usarImagen = Boolean(logoUrl) && !falloImagen;
  const texto = iniciales(limpio);
  // Cuatro letras en el mismo cuerpo que dos se saldrían del cuadro.
  const escala = texto.length >= 4 ? 0.26 : texto.length === 3 ? 0.31 : 0.36;

  return (
    <span
      className="nt-carrier"
      style={
        // El tono va como string: un número suelto en una custom property queda
        // a merced de cómo lo serialice React.
        { "--nv-hue": String(hueDeNombre(limpio)), width: size, height: size } as React.CSSProperties
      }
      title={limpio}
      aria-label={limpio}
      role="img"
    >
      {usarImagen ? (
        <img
          src={logoUrl as string}
          alt=""
          // Margen mínimo: el logo debe ocupar la ficha, no flotar dentro de ella.
          className="h-full w-full object-contain p-[3px]"
          loading="lazy"
          // Una URL rota no puede dejar el hueco: se cae al monograma.
          onError={() => setFalloImagen(true)}
        />
      ) : (
        <span
          className="font-extrabold leading-none tracking-tight"
          style={{ fontSize: Math.round(size * escala) }}
          aria-hidden
        >
          {texto}
        </span>
      )}
    </span>
  );
}
