export type DashboardRole = "ADMIN" | "VENDEDOR";

export type DashboardMenuItem = {
  label: string;
  href: string;
  keywords?: string[];
  children?: DashboardMenuItem[];
};

export const dashboardMenu: Record<DashboardRole, DashboardMenuItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", keywords: ["inicio", "resumen"] },
    { label: "Productos", href: "/dashboard/admin/productos", keywords: ["catalogo", "stock"] },
    {
      label: "Ventas",
      href: "/dashboard/admin/ventas",
      keywords: ["caja", "pos"],
      children: [
        { label: "Nueva venta", href: "/dashboard/admin/ventas/venta" },
        { label: "Historial", href: "/dashboard/admin/ventas/historial" },
      ],
    },
    {
      label: "Inventario",
      href: "/dashboard/admin/inventario",
      keywords: ["almacen", "disponible"],
      children: [
        { label: "Resumen", href: "/dashboard/admin/inventario/resumen" },
        { label: "Stock actual", href: "/dashboard/admin/inventario/stock" },
        { label: "Movimientos", href: "/dashboard/admin/inventario/movimientos" },
      ],
    },
    { label: "Pedidos", href: "/dashboard/admin/pedidos", keywords: ["reserva", "comprobante"] },
    { label: "Reportes", href: "/dashboard/admin/reportes", keywords: ["metricas", "graficos"] },
    { label: "Usuarios", href: "/dashboard/admin/usuarios", keywords: ["roles", "equipo"] },
    { label: "Opciones Entrega", href: "/dashboard/admin/delivery", keywords: ["horarios", "envios", "puntos"] },
  ],
  VENDEDOR: [
    { label: "Dashboard", href: "/dashboard/vendedor", keywords: ["inicio", "resumen"] },
    {
      label: "Ventas",
      href: "/dashboard/vendedor/ventas",
      keywords: ["caja", "pos"],
      children: [
        { label: "Nueva venta", href: "/dashboard/vendedor/ventas/venta" },
        { label: "Historial", href: "/dashboard/vendedor/ventas/historial" },
      ],
    },
    { label: "Productos", href: "/dashboard/vendedor/productos", keywords: ["catalogo"] },
    {
      label: "Inventario",
      href: "/dashboard/vendedor/inventario",
      keywords: ["stock", "disponible"],
      children: [
        { label: "Resumen", href: "/dashboard/vendedor/inventario/resumen" },
        { label: "Stock actual", href: "/dashboard/vendedor/inventario/stock" },
        { label: "Movimientos", href: "/dashboard/vendedor/inventario/movimientos" },
      ],
    },
    { label: "Pedidos", href: "/dashboard/vendedor/pedidos", keywords: ["reserva", "comprobante"] },
  ],
};
