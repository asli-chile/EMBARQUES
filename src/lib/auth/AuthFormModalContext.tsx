"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type AuthFormMode = "login" | "registro";

type AuthFormModalContextValue = {
  open: boolean;
  mode: AuthFormMode;
  openAuthForm: (mode: AuthFormMode) => void;
  closeAuthForm: () => void;
};

const AuthFormModalContext = createContext<AuthFormModalContextValue | null>(null);

export function AuthFormModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthFormMode>("login");

  const openAuthForm = useCallback((m: AuthFormMode) => {
    setMode(m);
    setOpen(true);
  }, []);

  const closeAuthForm = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "login") return;

    openAuthForm("login");

    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    const next = url.searchParams.get("next");
    const clean = `${url.pathname}${next ? `?next=${encodeURIComponent(next)}` : ""}${url.hash}`;
    window.history.replaceState({}, "", clean);
  }, [openAuthForm]);

  return (
    <AuthFormModalContext.Provider
      value={{ open, mode, openAuthForm, closeAuthForm }}
    >
      {children}
    </AuthFormModalContext.Provider>
  );
}

export function useAuthFormModal(): AuthFormModalContextValue {
  const ctx = useContext(AuthFormModalContext);
  if (!ctx) {
    throw new Error("useAuthFormModal must be used within AuthFormModalProvider");
  }
  return ctx;
}
