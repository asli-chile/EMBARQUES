import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { brand } from "@/lib/brand";
import { withBase } from "@/lib/basePath";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getVisibleSidebarItems,
  resolveSidebarLabel,
  sidebarAccessFromAuth,
} from "@/lib/sidebarFilter";
import { sidebarIconFor } from "@/lib/ui/sidebarIcons";
import { LocaleToggle } from "./LocaleToggle";
import { NeonThemeToggle } from "@/components/ui/NeonThemeToggle";

type NavItem = {
  labelKey: string;
  id: string;
  href?: string;
  children?: readonly NavItem[];
};

type Props = {
  pathname: string;
};

/**
 * Navegación del ERP en teléfono.
 *
 * El rail lateral no sirve acá por dos razones: se come 64 px de un ancho que
 * ya escasea, y sus etiquetas aparecen al pasar el mouse, gesto que en un
 * teléfono no existe — o sea, nadie sabe qué significa cada icono.
 *
 * Este panel muestra los mismos ítems, con su nombre, y ocupa pantalla solo
 * mientras se usa. El filtrado por rol sale de `sidebarFilter`, el mismo que
 * usa el rail: si divergieran, alguien vería en el teléfono un módulo que en
 * el escritorio no tiene.
 *
 * Se dibuja en un portal sobre `body` porque el chrome del ERP está lleno de
 * contenedores con overflow oculto, y un panel a pantalla completa dentro de
 * uno de ellos sale recortado.
 */
export function AppMobileNav({ pathname }: Props) {
  const { t } = useLocale();
  const { user, profile, isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const nav = t.nav as unknown as Record<string, string>;
  const sidebarLabels = t.sidebar as Record<string, string>;
  const labelFor = (labelKey: string) => resolveSidebarLabel(labelKey, sidebarLabels, isCliente);

  const items = useMemo(
    () =>
      getVisibleSidebarItems(
        sidebarAccessFromAuth({
          isSuperadmin,
          isAdmin,
          isEjecutivo,
          isStaff,
          isCliente,
          user,
          profile,
        }),
      ) as NavItem[],
    [isSuperadmin, isAdmin, isEjecutivo, isStaff, isCliente, user, profile],
  );

  // Con el panel abierto, la página de atrás no debe desplazarse.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  const activo = (href?: string) =>
    !!href && (pathname === href || pathname.startsWith(`${href}/`));

  const enlace = (href: string, label: string, icono: string, hijo = false) => (
    <a
      key={href}
      href={withBase(href)}
      onClick={() => setAbierto(false)}
      className={`flex items-center gap-3 rounded-xl px-3 text-white/80 transition-colors active:bg-white/15 ${
        hijo ? "h-11 pl-11 text-[13.5px]" : "h-12 text-[14.5px] font-semibold"
      } ${activo(href) ? "bg-white/12 text-white ring-1 ring-white/15" : ""}`}
    >
      {!hijo && (
        <Icon icon={icono} width={22} height={22} className="shrink-0 opacity-95" aria-hidden />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </a>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={nav.menu ?? "Menú"}
        aria-expanded={abierto}
        /*
         * 44 px de lado: el tamaño que se acierta con el pulgar sin mirar. Los
         * iconos del header son más chicos porque se usan de a uno y con calma.
         */
        className="asli-no-drag relative z-10 -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/85 transition-colors active:bg-white/15 md:hidden"
      >
        <Icon icon="lucide:menu" width={24} height={24} aria-hidden />
      </button>

      {abierto &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[400] md:hidden" role="dialog" aria-modal="true">
            {/* El velo cierra al tocar fuera, que es como se cierra un panel así. */}
            <button
              type="button"
              aria-label={nav.close ?? "Cerrar"}
              onClick={() => setAbierto(false)}
              className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-[2px]"
            />

            <nav className="absolute inset-y-0 left-0 flex w-[86%] max-w-[330px] flex-col bg-[#0B1A3D] shadow-2xl">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3">
                <a
                  href={withBase("/inicio")}
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-2.5"
                >
                  <img src={brand.logoWhite} alt="ASLI" className="h-7 w-auto object-contain" />
                </a>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  aria-label={nav.close ?? "Cerrar"}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 active:bg-white/15"
                >
                  <Icon icon="lucide:x" width={22} height={22} aria-hidden />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
                {enlace("/inicio", nav.home, "lucide:house")}
                {user ? enlace("/dashboard", nav.dashboardShort, "lucide:layout-dashboard") : null}

                {items.map((item) => {
                  if (item.id === "dashboard" || item.id === "inicio") return null;
                  if (!item.children?.length) {
                    return item.href
                      ? enlace(item.href, labelFor(item.labelKey), sidebarIconFor(item.id))
                      : null;
                  }
                  const grupoAbierto = expandido === item.id;
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setExpandido(grupoAbierto ? null : item.id)}
                        aria-expanded={grupoAbierto}
                        className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[14.5px] font-semibold text-white/80 active:bg-white/15"
                      >
                        <Icon
                          icon={sidebarIconFor(item.id)}
                          width={22}
                          height={22}
                          className="shrink-0 opacity-95"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{labelFor(item.labelKey)}</span>
                        <Icon
                          icon="lucide:chevron-down"
                          width={17}
                          height={17}
                          className={`shrink-0 text-white/50 transition-transform ${
                            grupoAbierto ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                      {grupoAbierto &&
                        item.children.map((hijo) =>
                          hijo.href ? enlace(hijo.href, labelFor(hijo.labelKey), "", true) : null,
                        )}
                    </div>
                  );
                })}
              </div>

              {/*
                * Lo que se sacó del header.
                *
                * Tema e idioma se eligen una vez y se dejan puestos; en la barra
                * competían por el ancho con el logo y el nombre, que se miran
                * todo el tiempo. Acá siguen a un toque de distancia.
                */}
              <div className="shrink-0 border-t border-white/10 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-white/60">{nav.language}</span>
                  <LocaleToggle variant="dark" />
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-white/60">
                    {nav.theme ?? "Tema"}
                  </span>
                  <NeonThemeToggle variant="header" />
                </div>
                <a
                  href="https://www.asli.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex h-11 items-center gap-3 rounded-xl px-1 text-[13.5px] font-semibold text-white/70 active:bg-white/10"
                >
                  <Icon icon="lucide:globe" width={20} height={20} aria-hidden />
                  {nav.website}
                </a>
                <p className="truncate px-1 pt-1 text-[12.5px] text-white/45">
                  {profile?.nombre || user?.email || nav.guest}
                </p>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
