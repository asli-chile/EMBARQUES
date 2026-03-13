"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
