"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

type PaymentReviewData = {
  payment: {
    _id: string;
    paymentNumber: string;
    metodoPago: string;
    amount: number;
    status: string;
    comprobanteUrl: string | null;
    createdAt: string;
  };
  order: {
    _id: string;
    orderNumber: string;
    channel: string;
    metodoPago: string;
    subtotal: number;
    descuento: number;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    customerSnapshot?: {
      fullname?: string;
      email?: string;
      phone?: string;
    };
    deliverySnapshot?: {
      method?: string;
      address?: string;
      phone?: string;
      department?: string;
      city?: string;
      shippingCompany?: string;
      branch?: string;
      senderName?: string;
      senderCI?: string;
      senderPhone?: string;
      scheduledAt?: string;
    };
    items: Array<{
      productoSnapshot: { nombre: string; modelo?: string; imagen?: string };
      variante: { color: string; talla: string };
      cantidad: number;
      precioUnitario: number;
    }>;
  };
};

type PageState = "loading" | "ready" | "error" | "used" | "confirming" | "rejecting" | "confirmed" | "rejected";

const DELIVERY_LABELS: Record<string, string> = {
  WHATSAPP: "📱 WhatsApp",
  PICKUP_POINT: "🏠 Punto de Encuentro",
  SHIPPING_NATIONAL: "📦 Envío Nacional",
};

export default function VerificarPagoPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<PaymentReviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/verify/payment/${token}`)
      .then(async (res) => {
        if (res.status === 410) {
          setState("used");
          return;
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Link inválido");
        }
        const json = await res.json();
        setData(json);
        setState("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setState("error");
      });
  }, [token]);

  const handleConfirm = async () => {
    setState("confirming");
    try {
      const res = await fetch(`/api/verify/payment/${token}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setState("confirmed");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al confirmar");
      setState("ready");
    }
  };

  const handleReject = async () => {
    setState("rejecting");
    try {
      const res = await fetch(`/api/verify/payment/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setState("rejected");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al rechazar");
      setState("ready");
    }
  };

  // ── Estados de carga ──────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verificando link...</p>
        </div>
      </div>
    );
  }

  if (state === "used") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Link ya utilizado</h1>
          <p className="text-gray-400">Este link de verificación ya fue procesado y no puede usarse nuevamente.</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Link inválido</h1>
          <p className="text-gray-400">{errorMsg || "No se pudo cargar la información del pago."}</p>
        </div>
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-400 mb-2">Pago Confirmado</h1>
          <p className="text-gray-300">El pedido <strong>{data?.order.orderNumber}</strong> fue confirmado.</p>
          <p className="text-gray-400 text-sm mt-2">La venta quedó registrada correctamente en el sistema.</p>
        </div>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Pago Rechazado</h1>
          <p className="text-gray-300">El pedido <strong>{data?.order.orderNumber}</strong> fue cancelado.</p>
          <p className="text-gray-400 text-sm mt-2">El stock fue liberado automáticamente.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { payment, order } = data;
  const isProcessing = state === "confirming" || state === "rejecting";
  const deliveryLabel = DELIVERY_LABELS[order.deliverySnapshot?.method ?? ""] || order.deliverySnapshot?.method || "—";

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <span className="text-amber-400 text-sm font-semibold">🔍 Revisión de Comprobante QR</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Pedido {order.orderNumber}</h1>
          <p className="text-gray-400 text-sm mt-1">Pago {payment.paymentNumber}</p>
        </div>

        {/* Comprobante */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Comprobante de Pago</h2>
          {payment.comprobanteUrl ? (
            <div className="relative w-full bg-black rounded-xl overflow-hidden border border-white/10">
              <Image
                src={payment.comprobanteUrl}
                alt="Comprobante de pago"
                width={600}
                height={400}
                className="w-full object-contain max-h-96"
                unoptimized
              />
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl p-8 text-center text-gray-500">
              Sin imagen de comprobante
            </div>
          )}
        </div>

        {/* Datos del pedido */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Datos del Pedido</h2>

          {/* Cliente */}
          {order.customerSnapshot && (
            <div className="bg-white/5 rounded-xl p-4 space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Cliente</p>
              <p className="text-white font-medium">{order.customerSnapshot.fullname || "—"}</p>
              <p className="text-gray-400 text-sm">{order.customerSnapshot.email}</p>
              {order.customerSnapshot.phone && (
                <p className="text-gray-400 text-sm">📞 {order.customerSnapshot.phone}</p>
              )}
            </div>
          )}

          {/* Entrega */}
          <div className="bg-white/5 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Método de Entrega</p>
            <p className="text-white font-medium">{deliveryLabel}</p>
            {order.deliverySnapshot?.address && (
              <p className="text-gray-400 text-sm">📍 {order.deliverySnapshot.address}</p>
            )}
            {order.deliverySnapshot?.scheduledAt && (
              <p className="text-gray-400 text-sm">🕐 {order.deliverySnapshot.scheduledAt}</p>
            )}
            {order.deliverySnapshot?.department && (
              <p className="text-gray-400 text-sm">🗺️ {order.deliverySnapshot.department}{order.deliverySnapshot.city ? ` / ${order.deliverySnapshot.city}` : ""}</p>
            )}
            {order.deliverySnapshot?.shippingCompany && (
              <p className="text-gray-400 text-sm">🚚 {order.deliverySnapshot.shippingCompany}{order.deliverySnapshot.branch ? ` — ${order.deliverySnapshot.branch}` : ""}</p>
            )}
            {order.deliverySnapshot?.senderName && (
              <p className="text-gray-400 text-sm">👤 {order.deliverySnapshot.senderName} | CI: {order.deliverySnapshot.senderCI} | 📞 {order.deliverySnapshot.senderPhone}</p>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Productos</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                {item.productoSnapshot.imagen && (
                  <Image
                    src={item.productoSnapshot.imagen}
                    alt={item.productoSnapshot.nombre}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover border border-white/10"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.productoSnapshot.nombre}</p>
                  <p className="text-gray-400 text-xs">{item.variante.color} — {item.variante.talla} × {item.cantidad}</p>
                </div>
                <p className="text-cyan-400 font-mono text-sm font-bold shrink-0">
                  Bs {(item.precioUnitario * item.cantidad).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="bg-black/30 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-gray-300 font-mono">Bs {order.subtotal.toFixed(2)}</span>
            </div>
            {order.descuento > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">Descuento</span>
                <span className="text-amber-400 font-mono">−Bs {order.descuento.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
              <span className="text-white">Total</span>
              <span className="text-cyan-400 font-mono">Bs {order.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Método de pago</span>
              <span className="text-gray-400">{order.metodoPago}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {showRejectForm && (
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 space-y-3">
            <p className="text-sm text-gray-300">Motivo del rechazo (opcional):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: El comprobante no corresponde al monto exacto..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm resize-none focus:border-red-500 focus:outline-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectForm(false)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-gray-400 hover:border-white/30 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm disabled:opacity-50"
              >
                {state === "rejecting" ? "Rechazando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setShowRejectForm(true); setErrorMsg(""); }}
            disabled={isProcessing || showRejectForm}
            className="py-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            ❌ Rechazar Pago
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
          >
            {state === "confirming" ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirmando...
              </>
            ) : (
              "✅ Confirmar Pago"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          Este link es de un solo uso y expirará automáticamente una vez procesado.
        </p>
      </div>
    </div>
  );
}
