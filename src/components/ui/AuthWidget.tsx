import { useState } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthModal, type AuthUser } from "./AuthModal";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";
import { useAuthFormModal } from "@/lib/auth/AuthFormModalContext";

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
        className="motion-skeleton flex items-center justify-center w-11 h-11 rounded-full bg-neutral-100"
        aria-hidden
      />
    );
  }

  if (!authUser) {
    return (
      <button
        type="button"
        onClick={() => openAuthForm("login")}
        className="flex items-center justify-center gap-2 min-w-11 h-11 px-2.5 sm:px-4 rounded-lg text-base font-semibold text-brand-blue hover:bg-neutral-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        aria-label={t.auth.login}
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
        <span className="hidden sm:inline">{t.auth.login}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 text-brand-blue hover:bg-neutral-200/80 rounded-full transition-all duration-200"
        aria-label="Ver perfil de usuario"
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
      </button>
      <AuthModal isOpen={isModalOpen} onClose={handleClose} user={authUser} />
    </>
  );
}
