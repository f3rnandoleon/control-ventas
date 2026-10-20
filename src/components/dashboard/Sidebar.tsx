"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  dashboardMenu,
  type DashboardRole,
} from "./dashboardMenu";

export default function Sidebar({ role }: { role: string }) {
  const items = useMemo(() => dashboardMenu[role as DashboardRole] || [], [role]);
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [openLogout, setOpenLogout] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = items.find((item) => item.children?.some((child) => pathname === child.href));
    setOpenGroup(activeGroup?.href ?? null);
  }, [items, pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarContent = (
    <aside className="flex h-[100dvh] w-72 flex-col border-r border-sky-100 bg-white/95 p-5 shadow-[0_18px_40px_rgba(14,116,144,0.1)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-200">
      {/* HEADER DE SIDEBAR / PERFIL */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex-1 rounded-2xl border border-sky-100 bg-sky-50/80 p-3.5 transition-colors dark:border-white/10 dark:bg-slate-800/80">
          <Link href="/dashboard/perfil" onClick={() => setOpenMobile(false)} className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white shadow-md">
              {user?.nombreCompleto?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {user?.nombreCompleto || "Usuario"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400">
                {user?.rol || "..."}
              </p>
              <p className="text-[11px] text-sky-600 underline dark:text-sky-400">
                Ver Perfil
              </p>
            </div>
          </Link>
        </div>

        {/* BOTÓN CERRAR EN MÓVIL */}
        <button
          type="button"
          onClick={() => setOpenMobile(false)}
          aria-label="Cerrar menú lateral"
          className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-slate-600 transition hover:bg-sky-100 active:scale-95 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden"
        >
          <span className="text-lg font-bold leading-none">✕</span>
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isOpen = openGroup === item.href;

          if (hasChildren) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenGroup((current) => current === item.href ? null : item.href)}
                  aria-expanded={isOpen}
                  className={`flex w-full min-h-[44px] items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-sky-600 text-white shadow-[0_12px_24px_rgba(2,132,199,0.22)]"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xs transition-transform duration-200">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="ml-3 space-y-1 border-l-2 border-sky-200 pl-3 dark:border-white/10">
                    {item.children?.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpenMobile(false)}
                          aria-current={childActive ? "page" : undefined}
                          className={`block min-h-[40px] rounded-lg px-3 py-2 text-sm font-medium transition ${
                            childActive
                              ? "bg-sky-100 text-sky-900 font-semibold dark:bg-sky-950/70 dark:text-sky-300 dark:border dark:border-sky-500/30"
                              : "text-slate-600 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenMobile(false)}
              aria-current={isActive ? "page" : undefined}
              className={`block min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-600 text-white shadow-[0_12px_24px_rgba(2,132,199,0.22)]"
                  : "text-slate-700 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 space-y-2.5 border-t border-sky-100 pt-3 dark:border-white/10">
        <ThemeToggle className="w-full" />
        <button
          onClick={() => setOpenLogout(true)}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98] dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* BOTÓN FLOTANTE MODERNO PARA ABRIR MENÚ EN MÓVIL */}
      <button
        onClick={() => setOpenMobile(true)}
        aria-label="Abrir menú de navegación"
        className="fixed left-3 top-3 z-40 flex h-11 items-center gap-2 rounded-xl border border-sky-100 bg-white/90 px-3.5 text-xs font-bold text-sky-800 shadow-md backdrop-blur-md transition hover:bg-white active:scale-95 dark:border-white/10 dark:bg-slate-900/90 dark:text-sky-300 dark:hover:bg-slate-900 md:hidden"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <span>Menú</span>
      </button>

      {/* SIDEBAR FIJO EN ESCRITORIO */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* DRAWER MÓVIL CON ANIMACIÓN Y BACKDROP */}
      {openMobile && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setOpenMobile(false)}
          />
          <div className="relative z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      <ConfirmModal
        open={openLogout}
        title="Cerrar sesión"
        description="¿Estás seguro de que deseas cerrar tu sesión actual?"
        confirmText="Cerrar sesión"
        onCancel={() => setOpenLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
