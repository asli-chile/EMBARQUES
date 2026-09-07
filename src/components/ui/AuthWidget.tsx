import { useState } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthModal, type AuthUser } from "./AuthModal";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";

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
        className="motion-skeleton flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
        aria-hidden
      />
    );
  }

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={() => openAuthForm("login")}
        className="asli-no-drag flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg px-2 text-base font-semibold text-brand-blue transition-colors hover:bg-neutral-200/80 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 sm:px-3"
        aria-label={t.auth.login}
        title={t.auth.login}
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
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
        className="asli-no-drag flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white transition-all duration-200 hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        aria-label={`Perfil de ${authUser.name}`}
        title={authUser.name}
      >
        <span aria-hidden>{initial}</span>
      </button>
      <AuthModal isOpen={isModalOpen} onClose={handleClose} user={authUser} />
    </>
  );
}
