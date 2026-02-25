import { useState, useEffect } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthModal, type AuthUser } from "./AuthModal";
import { createClient } from "@/lib/supabase/client";
import { siteConfig } from "@/lib/site";
import { useLocale } from "@/lib/i18n";

function toAuthUser(email: string, metadata?: { full_name?: string }): AuthUser {
  return {
    name: metadata?.full_name || "Usuario",
    email,
    level: "Usuario",
  };
}

export function AuthWidget() {
  const { t } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => setIsModalOpen(false);

  useEffect(() => {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      setUser(toAuthUser(siteConfig.user.email, { full_name: siteConfig.user.name }));
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(toAuthUser(session.user.email ?? "", session.user.user_metadata));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      initSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 animate-pulse"
        aria-hidden
      />
    );
  }

  if (!user) {
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
      <AuthModal isOpen={isModalOpen} onClose={handleClose} user={user} />
    </>
  );
}
