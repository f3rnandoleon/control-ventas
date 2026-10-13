import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import Traspaso from "@/models/traspaso";
import NivelStock from "@/models/nivelStock";
import SesionCaja from "@/models/sesionCaja";
import { requireStaffApiAuth } from "@/libs/requireApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    await connectDB();

    const [
      pedidosPendientesPago,
      pedidosPorEntregar,
      traspasosEnTransito,
      traspasosSolicitados,
      stockBajoCount,
      sesionesCajaAbiertas,
      ultimosPedidosPendientes,
      ultimosTraspasosTransito,
    ] = await Promise.all([
      Pedido.countDocuments({ estadoPedido: "PENDING_PAYMENT" }),
      Pedido.countDocuments({
        estadoPedido: "CONFIRMED",
        estadoEntrega: { $in: ["PENDING", "READY"] },
      }),
      Traspaso.countDocuments({ estado: "EN_TRANSITO" }),
      Traspaso.countDocuments({ estado: "SOLICITADA" }),
      NivelStock.countDocuments({
        $expr: { $lte: ["$stockFisico", "$stockMinimo"] },
      }),
      SesionCaja.countDocuments({ estado: "ABIERTA" }),
      Pedido.find({ estadoPedido: "PENDING_PAYMENT" })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("numeroPedido total cliente canal createdAt")
        .lean(),
      Traspaso.find({ estado: "EN_TRANSITO" })
        .sort({ updatedAt: -1 })
        .limit(3)
        .populate("sucursalOrigenId", "nombre codigo")
        .populate("sucursalDestinoId", "nombre codigo")
        .select("codigo estado totalItems updatedAt sucursalOrigenId sucursalDestinoId")
        .lean(),
    ]);

    // Construir lista de alertas detalladas
    const items: Array<{
      id: string;
      tipo: "PEDIDO" | "STOCK" | "TRASPASO" | "CAJA";
      titulo: string;
      descripcion: string;
      fecha?: string;
      href: string;
      urgente: boolean;
    }> = [];

    // Alertas de pedidos
    if (pedidosPendientesPago > 0) {
      items.push({
        id: "alert-pedidos-pendientes",
        tipo: "PEDIDO",
        titulo: `${pedidosPendientesPago} pedido(s) pendiente(s) de pago/validación`,
        descripcion: "Clientes esperando confirmación o comprobante por verificar.",
        href: "/dashboard/admin/pedidos",
        urgente: true,
      });
    }

    if (pedidosPorEntregar > 0) {
      items.push({
        id: "alert-pedidos-entregar",
        tipo: "PEDIDO",
        titulo: `${pedidosPorEntregar} pedido(s) listos para despacho`,
        descripcion: "Órdenes confirmadas pendientes de entrega o retiro.",
        href: "/dashboard/admin/pedidos",
        urgente: false,
      });
    }

    // Alertas de traspasos
    if (traspasosEnTransito > 0) {
      items.push({
        id: "alert-traspasos-transito",
        tipo: "TRASPASO",
        titulo: `${traspasosEnTransito} traspaso(s) en tránsito`,
        descripcion: "Mercadería viajando entre sucursales esperando recepción.",
        href: "/dashboard/admin/inventario/traspasos",
        urgente: true,
      });
    }

    if (traspasosSolicitados > 0) {
      items.push({
        id: "alert-traspasos-solicitados",
        tipo: "TRASPASO",
        titulo: `${traspasosSolicitados} solicitud(es) de traspaso`,
        descripcion: "Tiendas solicitando reabastecimiento entre locales.",
        href: "/dashboard/admin/inventario/traspasos",
        urgente: false,
      });
    }

    // Alertas de stock crítico
    if (stockBajoCount > 0) {
      items.push({
        id: "alert-stock-critico",
        tipo: "STOCK",
        titulo: `${stockBajoCount} variante(s) en stock crítico / bajo`,
        descripcion: "Existencias iguales o menores al mínimo establecido.",
        href: "/dashboard/admin/inventario/stock",
        urgente: true,
      });
    }

    // Alertas de cajas abiertas
    if (sesionesCajaAbiertas > 0) {
      items.push({
        id: "alert-cajas-abiertas",
        tipo: "CAJA",
        titulo: `${sesionesCajaAbiertas} sesión(es) de caja POS activa(s)`,
        descripcion: "Turnos de venta en sucursales actualmente en operación.",
        href: "/dashboard/admin/finanzas/cajas",
        urgente: false,
      });
    }

    const totalAlertas =
      pedidosPendientesPago +
      traspasosEnTransito +
      (stockBajoCount > 0 ? 1 : 0);

    return NextResponse.json({
      totalAlertas,
      kpis: {
        pedidosPendientesPago,
        pedidosPorEntregar,
        traspasosEnTransito,
        traspasosSolicitados,
        stockBajoCount,
        sesionesCajaAbiertas,
      },
      items,
      recientes: {
        pedidos: ultimosPedidosPendientes,
        traspasos: ultimosTraspasosTransito,
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener resumen de notificaciones",
      logLabel: "GET /api/notificaciones/resumen error:",
    });
  }
}
