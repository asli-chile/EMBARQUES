import { type ReactNode } from "react";
import { LocaleProvider } from "@/lib/i18n";

type AuthFormWrapperProps = {
  children: ReactNode;
};

export function AuthFormWrapper({ children }: AuthFormWrapperProps) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
