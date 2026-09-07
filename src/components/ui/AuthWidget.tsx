import { useState } from "react";
import { AuthModal, type AuthUser } from "./AuthModal";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";
import { IconLoginUser } from "@/components/layout/HeaderActionIcons";

function userInitial(name: string, email: string): string {
  const fromName = name.trim().charAt(0);
  if (fromName) return fromName.toLocaleUpperCase("es-CL");
  const fromEmail = email.trim().charAt(0);
  if (fromEmail) return fromEmail.toLocaleUpperCase("es-CL");
  return "?";
}

export function AuthWidget() {
  const { t } = useLocale();
  const { user, profile, isLoading } = useAuth();
  const { openAuthForm } = useAuthFormModal();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        className="motion-skeleton flex h-8 w-8 items-center justify-center rounded-sm bg-neutral-100"
        aria-hidden
      />
    );
  }

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={() => openAuthForm("login")}
        className="asli-no-drag inline-flex h-8 items-center justify-center gap-1.5 rounded-sm bg-brand-blue px-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 sm:px-3"
        aria-label={t.auth.login}
        title={t.auth.login}
      >
        <IconLoginUser className="text-white" size={16} />
        <span className="hidden sm:inline">{t.auth.login}</span>
      </button>
    );
  }

  const initial = userInitial(authUser.name, authUser.email);

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
