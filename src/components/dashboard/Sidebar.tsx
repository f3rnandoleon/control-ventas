"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ConfirmModal from "@/components/ui/ConfirmModal";

const menu = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Productos", href: "/dashboard/admin/productos" },
    { label: "Ventas", href: "/dashboard/admin/ventas" },
    { label: "Inventario", href: "/dashboard/admin/inventario" },
    { label: "Reportes", href: "/dashboard/admin/reportes" },
    { label: "Usuarios", href: "/dashboard/admin/usuarios" },
  ],
  VENDEDOR: [
    { label: "Dashboard", href: "/dashboard/vendedor" },
    { label: "Ventas", href: "/dashboard/vendedor/ventas" },
  ],
};

export default function Sidebar({ role }: { role: string }) {
  const items = menu[role as "ADMIN" | "VENDEDOR"] || [];
  const { logout, user } = useAuth();
  const router = useRouter();

  const [openLogout, setOpenLogout] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const SidebarContent = (
    <aside
      className="w-64 bg-slate-950 dark:bg-slate-950
      border-r border-white/10 p-6 flex flex-col h-full"
    >
      {/* Usuario */}
      {/* User Info */}
      <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg mb-6">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20
            flex items-center justify-center text-cyan-400 font-bold">
          {user?.fullname?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="text-sm">
          <p className="font-semibold">{user?.fullname || "Usuario"}</p>
          <p className="text-gray-400 text-xs">{user?.role || "..."}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="space-y-3 flex-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpenMobile(false)}
            className="block px-4 py-2 rounded-lg
              hover:bg-cyan-500/10 hover:text-cyan-400 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>


      {/* Logout */}
      <button
        onClick={() => setOpenLogout(true)}
        className="px-4 py-2 rounded-lg text-left
          text-red-400 hover:bg-red-500/10 transition
          border border-red-500/20"
      >
        Cerrar sesión
      </button>
    </aside>
  );

  return (
    <>
      {/* Mobile button */}
      <button
        onClick={() => setOpenMobile(true)}
        className="md:hidden fixed top-4 left-4 z-40
        bg-slate-950 border border-white/10 rounded-lg px-3 py-2"
      >
        ☰
      </button>

      {/* Desktop */}
      <div className="hidden md:block">{SidebarContent}</div>

      {/* Mobile overlay */}
      {openMobile && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpenMobile(false)}
          />
          <div className="relative z-50 animate-slide-in">
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Logout modal */}
      <ConfirmModal
        open={openLogout}
        title="¿Cerrar sesión?"
        description="Se cerrará tu sesión actual."
        onCancel={() => setOpenLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
