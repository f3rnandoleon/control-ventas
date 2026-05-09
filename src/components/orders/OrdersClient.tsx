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

const FILTER_TABS = [
  "TODOS",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
] as const;

const filterLabelMap: Record<(typeof FILTER_TABS)[number], string> = {
  TODOS: "Todos",
  PENDING_PAYMENT: "Pendientes de Pago",
  CONFIRMED: "Por Entregar",
  DELIVERED: "Entregados",
  CANCELLED: "Cancelados/Rechazados",
};

export default function OrdersClient() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof FILTER_TABS)[number]>("TODOS");
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
    if (!confirm("¿Confirmar este pedido para entrega? La reserva de stock se asegurará indefinidamente.")) {
      return;
    }

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
    if (!confirm("¿Confirmar entrega y cobro en efectivo? Se creará el pago y se descontará el stock.")) {
      return;
    }

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
    if (!confirm("¿Seguro que deseas cancelar este pedido? Se liberará el stock inmediatamente.")) {
      return;
    }

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

  const filteredOrders = pedidos.filter((order) => {
    if (tab === "PENDING_PAYMENT") return order.estadoPedido === "PENDING_PAYMENT";
    if (tab === "CONFIRMED") {
      return ["CONFIRMED", "READY", "IN_TRANSIT"].includes(order.estadoPedido);
    }
    if (tab === "DELIVERED") return order.estadoPedido === "DELIVERED";
    if (tab === "CANCELLED") return order.estadoPedido === "CANCELLED";
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight">Gestion de Pedidos Web</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTER_TABS.map((filterTab) => {
          const isActive = tab === filterTab;

          return (
            <button
              key={filterTab}
              onClick={() => {
                setTab(filterTab);
                setCurrentPage(1);
              }}
              className="rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: isActive ? "var(--card-strong)" : "var(--subcard)",
                color: isActive ? "var(--foreground)" : "var(--muted)",
                borderColor: "var(--border)",
                boxShadow: isActive ? "var(--shadow-soft)" : "none",
              }}
            >
              {filterLabelMap[filterTab]}
            </button>
          );
        })}
      </div>

      <div className="surface-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="font-medium"
              style={{
                background: "var(--subcard)",
                color: "var(--muted)",
              }}
            >
              <tr>
                <th className="px-6 py-4">Pedido / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Entrega</th>
                <th className="px-6 py-4">Pago / Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: "var(--muted)" }}>
                    <svg
                      className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <p>Cargando pedidos...</p>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center" style={{ color: "var(--muted)" }}>
                    No hay pedidos en esta categoria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-t transition-colors hover:bg-white/5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">{order.numeroPedido}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        {new Intl.DateTimeFormat("es-BO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(order.createdAt))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">
                        {order.snapshotCliente?.nombreCompleto || "Usuario anonimo"}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        {order.snapshotCliente?.telefono || "Sin telefono"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-primary">
                        {DELIVERY_METHOD_LABELS[order.snapshotEntrega?.metodo ?? ""] ||
                          order.snapshotEntrega?.metodo ||
                          "-"}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        {order.snapshotEntrega?.puntoRecojo || ""}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          order.estadoPago === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : order.estadoPago === "FAILED"
                              ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {order.metodoPago} • {PAYMENT_STATUS_LABELS[order.estadoPago] || order.estadoPago}
                      </span>
                      <div className="mt-1 font-medium text-primary">
                        Bs {order.total.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.estadoPedido === "CONFIRMED" ||
                          order.estadoPedido === "READY" ||
                          order.estadoPedido === "IN_TRANSIT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                            : order.estadoPedido === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : order.estadoPedido === "CANCELLED"
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.estadoPedido] || order.estadoPedido}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => fetchOrderDetails(order._id)}
                          className="inline-flex items-center justify-center rounded border px-3 py-1.5 text-xs font-medium transition-colors"
                          style={{
                            color: "var(--foreground)",
                            background: "var(--subcard)",
                            borderColor: "var(--border)",
                          }}
                        >
                          Detalles
                        </button>

                        {order.estadoPedido === "PENDING_PAYMENT" && order.metodoPago === "EFECTIVO" && (
                          <button
                            onClick={() => handleConfirmForDelivery(order._id)}
                            className="inline-flex items-center justify-center rounded bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                          >
                            Confirmar para Entrega
                          </button>
                        )}

                        {order.estadoPedido === "CONFIRMED" && order.estadoPago !== "PAID" && (
                          <button
                            onClick={() => handleConfirmCash(order._id)}
                            className="inline-flex items-center justify-center rounded bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                          >
                            Entregar y Cobrar
                          </button>
                        )}

                        {order.estadoPedido === "CONFIRMED" && order.estadoPago === "PAID" && (
                          <button
                            onClick={() => handleDeliver(order._id)}
                            className="inline-flex items-center justify-center rounded bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
                          >
                            Marcar Entregado
                          </button>
                        )}

                        {order.estadoPedido !== "CANCELLED" && order.estadoPedido !== "DELIVERED" && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="inline-flex items-center justify-center rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between border-t px-6 py-4"
            style={{
              borderColor: "var(--border)",
              background: "var(--subcard)",
            }}
          >
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              Mostrando pagina {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  background: "var(--card-strong)",
                }}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  background: "var(--card-strong)",
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          Pedido={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
