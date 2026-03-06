import { useState } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthModal, type AuthUser } from "./AuthModal";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";
import { useAuth, getRolLabel } from "@/lib/auth/AuthContext";

export function AuthWidget() {
  const { t } = useLocale();
  const { user, profile, isLoading } = useAuth();
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
        className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 animate-pulse"
        aria-hidden
      />
    );
  }

  if (!authUser) {
    return (
      <a
        href="/auth/login"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-brand-blue hover:bg-neutral-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
        {t.auth.login}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center w-10 h-10 text-brand-blue hover:bg-neutral-200/80 rounded-full transition-all duration-200"
        aria-label="Ver perfil de usuario"
      >
        <AuthIcon icon={siteConfig.authIcon} className="text-brand-blue" />
      </button>
      <AuthModal isOpen={isModalOpen} onClose={handleClose} user={authUser} />
    </>
  );
}
