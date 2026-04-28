"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  dashboardMenu,
  type DashboardRole,
} from "./dashboardMenu";

export default function Sidebar({ role }: { role: string }) {
  const items = dashboardMenu[role as DashboardRole] || [];
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [openLogout, setOpenLogout] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarContent = (
    <aside className="flex h-full w-72 flex-col border-r border-sky-100 bg-white/90 p-6 shadow-[0_18px_40px_rgba(14,116,144,0.1)] backdrop-blur-xl">
      <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
        <div className="flex items-center gap-3">
          
          <Link href="/dashboard/perfil" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
            {user?.nombreCompleto?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">
              {user?.nombreCompleto || "Usuario"}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-700">
              {user?.rol || "..."}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-800">
              Ver Perfil
            </p>
          </div>
          </Link>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenMobile(false)}
              aria-current={isActive ? "page" : undefined}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-sky-600 text-white shadow-[0_12px_24px_rgba(2,132,199,0.22)]"
                  : "text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setOpenLogout(true)}
        className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left font-medium text-red-700 transition hover:bg-red-100"
      >
        Cerrar sesion
      </button>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => setOpenMobile(true)}
        aria-label="Abrir menu lateral"
        className="fixed left-4 top-4 z-40 rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-800 shadow-md md:hidden"
      >
        Menu
      </button>

      <div className="hidden md:block">{sidebarContent}</div>

      {openMobile && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
          />
          <div className="relative z-50 animate-slide-in">{sidebarContent}</div>
        </div>
      )}

      <ConfirmModal
        open={openLogout}
        title="Cerrar sesion"
        description="Se cerrara tu sesion actual."
        onCancel={() => setOpenLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
