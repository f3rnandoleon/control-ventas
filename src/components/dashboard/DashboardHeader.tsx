"use client";

import { useAuth } from "@/context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="mb-6 flex items-center justify-between rounded-2xl border border-sky-100/80 bg-white/80 p-4 shadow-sm backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-900/80">
      <div className="flex items-center gap-3 pl-14 md:pl-0">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Hola, {user?.nombreCompleto || "Usuario"} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Panel de Control Multisucursal • Rol: <span className="font-semibold text-sky-600 dark:text-sky-400">{user?.rol || "STAFF"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
    </header>
  );
}
