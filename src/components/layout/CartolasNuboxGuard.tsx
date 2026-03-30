import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { canAccessCartolasNubox } from "@/lib/cartolas-nubox-access";

type CartolasNuboxGuardProps = {
  children: React.ReactNode;
};

export function CartolasNuboxGuard({ children }: CartolasNuboxGuardProps) {
  const { user, profile, isLoading } = useAuth();
  const { t } = useLocale();
  const tr = t.cartolasNuboxPage;

  const email = profile?.email ?? user?.email ?? "";
  const allowed = canAccessCartolasNubox(email);

  if (isLoading) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-500">{tr.loading}</p>
      </main>
    );
  }

  if (!profile && !user) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6" role="main">
        <p className="text-neutral-600">{tr.loginRequired}</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
        <p className="text-neutral-600 text-center max-w-md">{tr.forbidden}</p>
      </main>
    );
  }

  return <>{children}</>;
}
