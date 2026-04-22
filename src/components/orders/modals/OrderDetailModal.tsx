"use client";

import Image from "next/image";
import type { Order, OrderItem } from "@/types/order";
import { 
  ORDER_STATUS_LABELS, 
  PAYMENT_STATUS_LABELS, 
  FULFILLMENT_STATUS_LABELS,
  DELIVERY_METHOD_LABELS
} from "@/constants/statusLabels";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Detalles del Pedido: <span className="text-indigo-600 dark:text-indigo-400">{order.orderNumber}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Grid de Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Información del Cliente</h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {order.customerSnapshot?.fullname || "Anónimo"}
                </p>
                <p className="text-xs text-slate-500">
                  📞 {order.customerSnapshot?.phone || "Sin teléfono"}
                </p>
                <p className="text-xs text-slate-500">
                  📧 {order.customerSnapshot?.email || "Sin email registrado"}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Datos de Entrega</h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Método: {DELIVERY_METHOD_LABELS[order.deliverySnapshot?.method ?? ""] || order.deliverySnapshot?.method || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  Lugar: {order.deliverySnapshot?.pickupPoint || "No especificado"}
                </p>
                {order.deliverySnapshot?.scheduledAt && (
                  <p className="text-xs text-slate-500">
                    Agendado: {order.deliverySnapshot.scheduledAt}
                  </p>
                )}
                {order.deliverySnapshot?.recipientName && (
                  <p className="text-xs text-slate-500">
                    Recibe: {order.deliverySnapshot.recipientName}
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Listado de Productos */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Items del Pedido</h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-center">Variante</th>
                    <th className="px-4 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items?.map((item: OrderItem, idx: number) => (
                    <tr key={idx} className="text-slate-700 dark:text-slate-300">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.productoSnapshot?.imagen && (
                            <div className="relative w-10 h-10 overflow-hidden rounded-lg">
                              <Image 
                                src={item.productoSnapshot.imagen} 
                                alt={item.productoSnapshot.nombre} 
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.productoSnapshot?.nombre}</p>
                            <p className="text-[10px] text-slate-500">{item.productoSnapshot?.modelo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs">{item.variante?.color || "N/A"}</span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded mt-0.5">{item.variante?.talla || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">x{item.cantidad}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-400 block tabular-nums">Bs {item.precioUnitario?.toFixed(2)}</span>
                        <span className="font-semibold block tabular-nums text-slate-900 dark:text-white">Bs {item.totalLinea?.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-500 uppercase tracking-tight">Total Pedido</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-indigo-600 dark:text-indigo-400 tabular-nums">
                      Bs {order.total?.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Timeline / Notas (Opcional) */}
          <section className="bg-amber-50 dark:bg-indigo-900/10 border border-amber-200 dark:border-indigo-500/20 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-amber-800 dark:text-indigo-300 uppercase mb-2">Resumen Operativo</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-amber-700 dark:text-indigo-200">
              <p>📌 Estado: <span className="font-bold">{ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}</span></p>
              <p>💰 Pago: <span className="font-bold">{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</span></p>
              <p>📦 Fulfillment: <span className="font-bold">{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus] || order.fulfillmentStatus}</span></p>
              <p>🗓️ Creado: <span>{new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))}</span></p>
            </div>
          </section>

          {(order.notes || order.cancelReason) && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Observaciones y Notas</h3>
              <div className="grid grid-cols-1 gap-4">
                {order.notes && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">Notas del Cliente</p>
                    <p className="text-sm text-blue-700 dark:text-blue-200 italic">&quot;{order.notes}&quot;</p>
                  </div>
                )}
                {order.cancelReason && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase mb-1">Motivo de Cancelación / Rechazo</p>
                    <p className="text-sm text-red-700 dark:text-red-200">{order.cancelReason}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
