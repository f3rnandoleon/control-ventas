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
        { label: "Reabastecimiento", href: "/dashboard/admin/inventario/compras", keywords: ["compras", "proveedor", "entrada"] },
        { label: "Traspasos", href: "/dashboard/admin/inventario/traspasos", keywords: ["transferencias", "sucursales", "envios"] },
        { label: "Tarjetas Valoradas", href: "/dashboard/admin/inventario/kardex", keywords: ["kardex", "valorado", "inversion"] },
      ],
    },
    { label: "Sucursales", href: "/dashboard/admin/sucursales", keywords: ["tiendas", "almacenes", "locales", "red"] },
    {
      label: "Finanzas",
      href: "/dashboard/admin/finanzas/cuentas",
      keywords: ["cuentas", "cajas", "gastos", "pl", "utilidad", "tesoreria", "cierre"],
      children: [
        { label: "Cuentas y Cajas", href: "/dashboard/admin/finanzas/cuentas" },
        { label: "Gastos Operativos", href: "/dashboard/admin/finanzas/gastos" },
        { label: "Sesiones de Caja (POS)", href: "/dashboard/admin/finanzas/cajas" },
        { label: "Devoluciones y Cambios", href: "/dashboard/admin/finanzas/devoluciones", keywords: ["cambios", "garantia", "reembolsos"] },
        { label: "Estado de Resultados (P&L)", href: "/dashboard/admin/finanzas/reportes" },
        { label: "Flujo de Caja", href: "/dashboard/admin/finanzas/flujo-caja" },
      ],
    },
    { label: "Pedidos", href: "/dashboard/admin/pedidos", keywords: ["reserva", "comprobante"] },
    { label: "Reportes", href: "/dashboard/admin/reportes", keywords: ["metricas", "graficos"] },
    { label: "Usuarios", href: "/dashboard/admin/usuarios", keywords: ["roles", "equipo"] },
    {
      label: "Ajustes",
      href: "/dashboard/admin/ajustes",
      keywords: ["configuracion", "tipo de cambio", "politicas", "delivery", "finanzas"],
      children: [
        { label: "General y Políticas", href: "/dashboard/admin/ajustes" },
        { label: "Opciones Entrega", href: "/dashboard/admin/delivery" },
      ],
    },
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
