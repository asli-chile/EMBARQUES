/**
 * Credenciales recordadas solo en el shell de escritorio (.exe).
 * No es un vault cifrado: ofuscación básica para no dejar texto plano.
 */

const STORAGE_KEY = "asli.desktop.remembered-login.v1";

export type RememberedLogin = {
  email: string;
  password: string;
};

function encode(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function decode(stored: string): string | null {
  try {
    const bin = atob(stored);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function loadRememberedLogin(): RememberedLogin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const decoded = decode(raw);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded) as Partial<RememberedLogin>;
    const email = typeof parsed.email === "string" ? parsed.email.trim() : "";
    const password = typeof parsed.password === "string" ? parsed.password : "";
    if (!email || !password) return null;
    return { email, password };
  } catch {
    return null;
  }
}

export function saveRememberedLogin(creds: RememberedLogin): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, encode(JSON.stringify(creds)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearRememberedLogin(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
