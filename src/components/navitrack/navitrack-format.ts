/**
 * Formato de fechas, distancias y tiempos relativos de NaviTrack.
 *
 * Regla del módulo: nunca mostrar una hora que el dato no tiene. El ETA del ERP
 * es una columna `date`, así que se muestra solo el día; el ETA del AIS sí trae
 * hora y se muestra completa. Inventar "08:00" haría que el módulo se lea
 * preciso justo donde no lo es.
 */

import type { Locale } from "@/lib/i18n/translations";
import { DAY_MS, HOUR_MS } from "./navitrack-model";

const tag = (locale: Locale) => (locale === "es" ? "es-CL" : "en-US");

/** "28 SEP 2026" */
export function fmtFecha(d: Date | null, locale: Locale): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat(tag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(/\./g, "")
    .toUpperCase();
}

/** "28 SEP 2026 · 11:20" */
export function fmtFechaHora(d: Date | null, locale: Locale): string | null {
  if (!d) return null;
  const fecha = fmtFecha(d, locale);
  const hora = new Intl.DateTimeFormat(tag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${fecha} · ${hora}`;
}

/** "28 SEP" — versión corta para tablas y timeline. */
export function fmtFechaCorta(d: Date | null, locale: Locale): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat(tag(locale), { day: "2-digit", month: "short" })
    .format(d)
    .replace(/\./g, "")
    .toUpperCase();
}

export type RelativoTextos = {
  haceMenosDeUnMinuto: string;
  haceMinutos: string;
  haceHoras: string;
  haceDias: string;
};

/** "hace 42 minutos". Usa las claves traducidas, no una librería aparte. */
export function fmtRelativo(d: Date | null, textos: RelativoTextos, now = new Date()): string | null {
  if (!d) return null;
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return textos.haceMenosDeUnMinuto;
  if (diff < HOUR_MS) return textos.haceMinutos.replace("{{n}}", String(Math.floor(diff / 60_000)));
  if (diff < DAY_MS) return textos.haceHoras.replace("{{n}}", String(Math.floor(diff / HOUR_MS)));
  return textos.haceDias.replace("{{n}}", String(Math.floor(diff / DAY_MS)));
}

/** Millas náuticas con separador de miles y sin decimales. */
export function fmtNm(nm: number | null, locale: Locale): string | null {
  if (nm == null || !Number.isFinite(nm)) return null;
  return Math.round(nm).toLocaleString(tag(locale));
}

/** Reemplaza {{clave}} en un texto traducido. */
export function interpolar(texto: string, datos: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => datos[k] ?? "");
}
