"use client";

import Link from "next/link";

const menu = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Productos", href: "/dashboard/admin/productos" },
    { label: "Ventas", href: "/dashboard/admin/ventas" },
    { label: "Inventario", href: "/dashboard/admin/inventario" },
    { label: "Reportes", href: "/dashboard/admin/reportes" },
  ],
  VENDEDOR: [
    { label: "Dashboard", href: "/dashboard/vendedor" },
    { label: "Ventas", href: "/dashboard/vendedor/ventas" },
  ],
};

export default function Sidebar({ role }: { role: string }) {
  const items = menu[role as "ADMIN" | "VENDEDOR"] || [];

  return (
    <aside className="w-64 bg-slate-950 border-r border-white/10 p-6">
      <h2 className="text-xl font-bold mb-8 text-cyan-400">
        Control Ventas
      </h2>

      <nav className="space-y-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-2 rounded-lg 
              hover:bg-cyan-500/10 hover:text-cyan-400 transition"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
