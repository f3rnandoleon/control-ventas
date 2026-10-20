"use client";

import { useAuth } from "@/context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-sky-100/80 bg-white/80 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-900/80">
      <div className="flex min-w-0 items-center gap-2 pl-24 md:pl-0 sm:gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-bold text-slate-800 dark:text-white sm:text-sm">
            Hola, {user?.nombreCompleto || "Usuario"} 👋
          </h2>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            Multisucursal • Rol: <span className="font-semibold text-sky-600 dark:text-sky-400">{user?.rol || "STAFF"}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
