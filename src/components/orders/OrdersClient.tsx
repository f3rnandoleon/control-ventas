"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Pedido } from "@/types/pedido";
import OrderDetailModal from "./modals/OrderDetailModal";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  DELIVERY_METHOD_LABELS,
} from "@/constants/statusLabels";

export default function OrdersClient() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("TODOS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const itemsPerPage = 10;

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pedidos");
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setPedidos(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleConfirmForDelivery = async (pedidoId: string) => {
    if (!confirm("¿Confirmar este pedido para entrega? La reserva de stock se asegurará indefinidamente.")) return;

    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/confirm-for-delivery`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falló confirmación");
      toast.success("Pedido confirmado para entrega");
      fetchPedidos();
    } catch {
      toast.error("Error al confirmar el pedido");
    }
  };

  const handleConfirmCash = async (pedidoId: string) => {
    if (!confirm("¿Confirmar entrega y cobro en efectivo? Se creará el pago y se descontará el stock.")) return;

    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/confirm-cash`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falló confirmación");
      toast.success("Pedido finalizado y pago registrado");
      fetchPedidos();
    } catch {
      toast.error("Error al finalizar la venta en efectivo");
    }
  };

  const handleDeliver = async (pedidoId: string) => {
    if (!confirm("¿Marcar este pedido como entregado?")) return;

    try {
      const res = await fetch("/api/entregas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      if (!res.ok) throw new Error("Falló crear entrega");

      const data = await res.json();
      const entregaId =
        data._id || data.entrega?._id || data.fulfillment?._id || data.id;

      const patchRes = await fetch(`/api/entregas/${entregaId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "DELIVERED" }),
      });

      if (!patchRes.ok) {
        const fallbackRes = await fetch(`/api/pedidos/${pedidoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estadoPedido: "DELIVERED",
            estadoEntrega: "DELIVERED",
          }),
        });

        if (!fallbackRes.ok) {
          throw new Error("Falló al actualizar estado de entrega");
        }
      }

      toast.success("Pedido entregado");
      fetchPedidos();
    } catch (err) {
      console.error(err);
      toast.error("Error al marcar como entregado");
    }
  };

  const handleCancelOrder = async (pedidoId: string) => {
    if (!confirm("¿Seguro que deseas cancelar este pedido? Se liberará el stock inmediatamente.")) return;

    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPedido: "CANCELLED" }),
      });
      if (!res.ok) throw new Error("Falló cancelación");
      toast.success("Pedido cancelado y stock liberado");
      fetchPedidos();
    } catch {
      toast.error("Error al cancelar el pedido");
    }
  };

  const fetchOrderDetails = async (pedidoId: string) => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`);
      if (!res.ok) throw new Error("No se pudo cargar el detalle");
      const data = await res.json();
      setSelectedOrder(data);
    } catch {
      toast.error("Error al cargar detalles");
    }
  };

  const filteredOrders = pedidos.filter((o) => {
    if (tab === "PENDING_PAYMENT") return o.estadoPedido === "PENDING_PAYMENT";
    if (tab === "CONFIRMED") return ["CONFIRMED", "READY", "IN_TRANSIT"].includes(o.estadoPedido);
    if (tab === "DELIVERED") return o.estadoPedido === "DELIVERED";
    if (tab === "CANCELLED") return o.estadoPedido === "CANCELLED";
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Pedidos Web</h1>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2">
        {["TODOS", "PENDING_PAYMENT", "CONFIRMED", "DELIVERED", "CANCELLED"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {t === "TODOS" && "Todos"}
            {t === "PENDING_PAYMENT" && "Pendientes de Pago"}
            {t === "CONFIRMED" && "Por Entregar"}
            {t === "DELIVERED" && "Entregados"}
            {t === "CANCELLED" && "Cancelados/Rechazados"}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Pedido / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Entrega</th>
                <th className="px-6 py-4">Pago / Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <svg className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p>Cargando pedidos...</p>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay pedidos en esta categoría.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {o.numeroPedido}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Intl.DateTimeFormat("es-BO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(o.createdAt))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {o.snapshotCliente?.nombreCompleto || "Usuario anónimo"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {o.snapshotCliente?.telefono || "Sin teléfono"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {DELIVERY_METHOD_LABELS[o.snapshotEntrega?.metodo ?? ""] || o.snapshotEntrega?.metodo || "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {o.snapshotEntrega?.puntoRecojo || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          o.estadoPago === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : o.estadoPago === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {o.metodoPago} • {PAYMENT_STATUS_LABELS[o.estadoPago] || o.estadoPago}
                      </span>
                      <div className="font-medium text-slate-900 dark:text-white mt-1">
                        Bs {o.total.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          o.estadoPedido === "CONFIRMED" || o.estadoPedido === "READY" || o.estadoPedido === "IN_TRANSIT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                            : o.estadoPedido === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : o.estadoPedido === "CANCELLED"
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[o.estadoPedido] || o.estadoPedido}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => fetchOrderDetails(o._id)}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        Detalles
                      </button>

                      {o.estadoPedido === "PENDING_PAYMENT" && o.metodoPago === "EFECTIVO" && (
                        <button
                          onClick={() => handleConfirmForDelivery(o._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 transition-colors"
                        >
                          Confirmar para Entrega
                        </button>
                      )}

                      {o.estadoPedido === "CONFIRMED" && o.estadoPago !== "PAID" && (
                        <button
                          onClick={() => handleConfirmCash(o._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 transition-colors"
                        >
                          Entregar y Cobrar
                        </button>
                      )}

                      {o.estadoPedido === "CONFIRMED" && o.estadoPago === "PAID" && (
                        <button
                          onClick={() => handleDeliver(o._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 transition-colors"
                        >
                          Marcar Entregado
                        </button>
                      )}

                      {o.estadoPedido !== "CANCELLED" && o.estadoPedido !== "DELIVERED" && (
                        <button
                          onClick={() => handleCancelOrder(o._id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20">
            <div className="text-sm text-slate-500">
              Mostrando página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded border border-slate-200 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded border border-slate-200 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal Pedido={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
