import { useState } from "react";
import { Icon } from "@iconify/react";
import { AuthModal, type AuthUser } from "./AuthModal";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { IconLoginUser, type HeaderChromeTone } from "@/components/layout/HeaderActionIcons";

function userInitial(name: string, email: string): string {
  const fromName = name.trim().charAt(0);
  if (fromName) return fromName.toLocaleUpperCase("es-CL");
  const fromEmail = email.trim().charAt(0);
  if (fromEmail) return fromEmail.toLocaleUpperCase("es-CL");
  return "?";
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function AuthWidget({ tone = "light" }: { tone?: HeaderChromeTone }) {
  const { t } = useLocale();
  const { user, profile, isLoading } = useAuth();
  const { openAuthForm } = useAuthFormModal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dark = tone === "dark";

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => setIsModalOpen(false);

  const authUser: AuthUser | null = user
    ? {
        name: profile?.nombre ?? user.name,
        email: user.email,
        level: profile ? getRolLabel(profile.rol) : "Usuario",
      }
    : import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      ? null
      : { name: siteConfig.user.name, email: siteConfig.user.email, level: siteConfig.user.level };

  if (isLoading) {
    return (
      <div
        className={`motion-skeleton flex h-8 w-8 items-center justify-center ${
          dark ? "rounded-full bg-white/10" : "rounded-sm bg-neutral-100"
        }`}
        aria-hidden
      />
    );
  }

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={() => openAuthForm("login")}
        className={
          dark
            ? "asli-no-drag inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-blue px-3 text-[12px] font-semibold text-white transition-colors hover:bg-brand-blue/90"
            : "asli-no-drag inline-flex h-8 items-center justify-center gap-1.5 rounded-sm bg-brand-blue px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 sm:px-3"
        }
        aria-label={t.auth.login}
        title={t.auth.login}
      >
        <IconLoginUser className="text-white" size={16} />
        <span className="hidden sm:inline">{t.auth.login}</span>
      </button>
    );
  }

  const initial = userInitial(authUser.name, authUser.email);
  const firstName = firstNameOf(authUser.name);

  if (dark) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpen}
          className="asli-no-drag group relative inline-flex h-9 items-center pl-0 pr-0 transition-opacity hover:opacity-95"
          aria-label={`Perfil de ${authUser.name}`}
          title={authUser.name}
        >
          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a3a6e] text-[13px] font-bold text-white ring-2 ring-[#0B1A3D]/50">
            <span aria-hidden>{initial}</span>
          </span>
          <span className="-ml-2.5 flex h-8 items-center gap-1 rounded-full border border-sky-300/35 bg-[#122847]/80 pl-4 pr-2.5 text-[12px] font-medium text-white/95 backdrop-blur-sm">
            <span className="max-w-[7.5rem] truncate">{firstName}</span>
            <Icon
              icon="lucide:chevron-down"
              width={14}
              height={14}
              className="shrink-0 text-white/55"
              aria-hidden
            />
          </span>
        </button>
        <AuthModal isOpen={isModalOpen} onClose={handleClose} user={authUser} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="asli-no-drag flex h-8 w-8 items-center justify-center rounded-sm bg-brand-blue text-[12px] font-bold text-white transition-colors hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        aria-label={`Perfil de ${authUser.name}`}
        title={authUser.name}
      >
        <span aria-hidden>{initial}</span>
      </button>
      <AuthModal isOpen={isModalOpen} onClose={handleClose} user={authUser} />
    </>
  );
}
