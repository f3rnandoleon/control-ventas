export type DashboardRole = "ADMIN" | "VENDEDOR";

export type DashboardMenuItem = {
  label: string;
  href: string;
  keywords?: string[];
};

export const dashboardMenu: Record<DashboardRole, DashboardMenuItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", keywords: ["inicio", "resumen"] },
    { label: "Productos", href: "/dashboard/admin/productos", keywords: ["catalogo", "stock"] },
    { label: "Ventas", href: "/dashboard/admin/ventas", keywords: ["caja", "pos"] },
    { label: "Inventario", href: "/dashboard/admin/inventario", keywords: ["almacen", "disponible"] },
    { label: "Pedidos", href: "/dashboard/admin/pedidos", keywords: ["reserva", "comprobante"] },
    { label: "Reportes", href: "/dashboard/admin/reportes", keywords: ["metricas", "graficos"] },
    { label: "Usuarios", href: "/dashboard/admin/usuarios", keywords: ["roles", "equipo"] },
  ],
  VENDEDOR: [
    { label: "Dashboard", href: "/dashboard/vendedor", keywords: ["inicio", "resumen"] },
    { label: "Ventas", href: "/dashboard/vendedor/ventas", keywords: ["caja", "pos"] },
    { label: "Productos", href: "/dashboard/vendedor/productos", keywords: ["catalogo"] },
    { label: "Inventario", href: "/dashboard/vendedor/inventario", keywords: ["stock", "disponible"] },
    { label: "Pedidos", href: "/dashboard/vendedor/pedidos", keywords: ["reserva", "comprobante"] },
  ],
};
