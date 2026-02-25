"use client";

import { Header } from "./Header";
import { NavBanner } from "./NavBanner";
import { Sidebar } from "./Sidebar";
import { LocaleProvider } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <NavBanner />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          {children}
        </div>
      </div>
    </LocaleProvider>
  );
}
