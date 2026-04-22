"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { 
  DELIVERY_METHOD_LABELS
} from "@/constants/statusLabels";

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
    fulfillmentStatus: string;
    createdAt: string;
    notes?: string | null;
    customerSnapshot?: {
      fullname?: string;
      email?: string;
      phone?: string;
      documentType?: string;
      documentNumber?: string;
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
      recipientName?: string;
      scheduledAt?: string;
      pickupPoint?: string;
    };
    items: Array<{
      productoSnapshot: { 
        nombre: string; 
        modelo?: string; 
        sku?: string;
        imagen?: string 
      };
      variante: { 
        color: string; 
        talla: string;
        variantId?: string;
        colorSecundario?: string;
      };
      cantidad: number;
      precioUnitario: number;
      totalLinea: number;
    }>;
  };
};

type PageState = "loading" | "ready" | "error" | "used" | "confirming" | "rejecting" | "confirmed" | "rejected";

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

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-slate-400 font-medium animate-pulse">Consultando estado del pago...</p>
        </div>
      </div>
    );
  }

  if (state === "used") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Enlace Expirado</h1>
          <p className="text-slate-400 leading-relaxed">
            Este link de verificación ya fue utilizado o procesado previamente. No se pueden realizar más acciones por seguridad.
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Error de Acceso</h1>
          <p className="text-slate-400 mb-6">{errorMsg || "No se pudo cargar la información del pago."}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 scale-animation">
            <span className="text-5xl text-emerald-400">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-emerald-400 mb-3">¡Confirmado!</h1>
          <p className="text-slate-300 mb-1">El pedido <span className="text-white font-bold">{data?.order.orderNumber}</span> ha sido aprobado.</p>
          <p className="text-slate-500 text-sm">El cliente recibirá su confirmación en breve.</p>
        </div>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl text-red-500">✕</span>
          </div>
          <h1 className="text-3xl font-bold text-red-400 mb-3">Pago Rechazado</h1>
          <p className="text-slate-300 mb-1">El pedido <span className="text-white font-bold">{data?.order.orderNumber}</span> fue cancelado.</p>
          <p className="text-slate-500 text-sm">El stock ha sido liberado automáticamente.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { payment, order } = data;
  const isProcessing = state === "confirming" || state === "rejecting";
  const deliveryLabel = DELIVERY_METHOD_LABELS[order.deliverySnapshot?.method ?? ""] || order.deliverySnapshot?.method || "—";
  const createdAtFormatted = new Intl.DateTimeFormat('es-BO', { 
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }).format(new Date(order.createdAt));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8 space-y-8">
        
        {/* Navigation & Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-500/20">
                Panel de Auditoría
              </span>
              <span className="text-slate-500 text-xs font-medium">{createdAtFormatted}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Pedido <span className="text-indigo-400">{order.orderNumber}</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Transacción QR: <span className="text-slate-300">{payment.paymentNumber}</span></p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Esperando Resolución</span>
            </div>
            <p className="text-xs text-slate-500">Monto a conciliar: <span className="text-indigo-300 font-bold">Bs {order.total.toFixed(2)}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Evidence & Items */}
          <div className="space-y-8">
            {/* Comprobante Section */}
            <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl group">
              <div className="bg-slate-800/50 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Evidencia de Pago</h3>
                <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300 font-mono italic">COMPROBANTE_UPLOADED</span>
              </div>
              <div className="p-4 bg-slate-950/20">
                {payment.comprobanteUrl ? (
                  <div className="relative aspect-[3/4] md:aspect-auto md:h-[500px] w-full rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-indigo-500/30 transition-all duration-500">
                    <Image
                      src={payment.comprobanteUrl}
                      alt="Comprobante de pago QR"
                      fill
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border-2 border-dashed border-white/5 text-slate-600">
                    <span className="text-6xl mb-4">🖼️</span>
                    <p className="text-sm">Sin imagen adjunta</p>
                  </div>
                )}
              </div>
            </div>

            {/* Listado de Productos */}
            <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
               <div className="bg-slate-800/50 px-6 py-4 border-b border-white/5">
                <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Detalle del Carrito</h3>
              </div>
              <div className="divide-y divide-white/5">
                {order.items.map((item, i) => (
                  <div key={i} className="p-5 flex gap-4 hover:bg-white/[0.02] transition-colors">
                    {item.productoSnapshot.imagen && (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/10 bg-slate-900 shrink-0">
                        <Image
                          src={item.productoSnapshot.imagen}
                          alt={item.productoSnapshot.nombre}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-white font-bold text-sm leading-tight truncate">{item.productoSnapshot.nombre}</h4>
                        <p className="text-indigo-400 font-mono text-sm font-bold ml-2 shrink-0">Bs {item.totalLinea.toFixed(2)}</p>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">{item.productoSnapshot.modelo || "Modelo estándar"} • {item.productoSnapshot.sku || "N/A"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded border border-white/5 uppercase">
                          {item.variante.color}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded border border-white/5 uppercase">
                          Talla: {item.variante.talla}
                        </span>
                        <span className="text-slate-500 text-xs ml-auto">Cant: <span className="text-white font-bold">{item.cantidad}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-950/50 p-6 space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal acumulado</span>
                  <span className="font-mono">Bs {order.subtotal.toFixed(2)}</span>
                </div>
                {order.descuento > 0 && (
                  <div className="flex justify-between text-xs text-amber-500 font-medium">
                    <span>Bonificación / Descuento</span>
                    <span className="font-mono">−Bs {order.descuento.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Monto Total</span>
                  <span className="text-2xl font-black text-indigo-400 font-mono tracking-tighter">Bs {order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customer & Shipping */}
          <div className="space-y-8">
            
            {/* Customer Details Card */}
            {order.customerSnapshot && (
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-5xl">👤</span>
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información del Comprador
                </h3>
                <div className="space-y-5">
                  <div>
                    <p className="text-white text-xl font-bold mb-0.5">{order.customerSnapshot.fullname || "Cliente sin nombre"}</p>
                    <p className="text-slate-500 text-sm">{order.customerSnapshot.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Teléfono</p>
                      <p className="text-slate-200 text-sm font-bold leading-none">{order.customerSnapshot.phone || "—"}</p>
                    </div>
                    {order.customerSnapshot.documentNumber && (
                      <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">{order.customerSnapshot.documentType || "ID"}</p>
                        <p className="text-slate-200 text-sm font-bold leading-none">{order.customerSnapshot.documentNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Info Card */}
            <div className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 shadow-lg shadow-indigo-500/5">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Logística de Entrega
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl pt-1">🚚</div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Método Seleccionado</p>
                    <p className="text-white font-bold text-lg">{deliveryLabel}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ubicación / Punto</p>
                      <p className="text-slate-200 text-sm font-bold leading-tight">
                        {order.deliverySnapshot?.address || order.deliverySnapshot?.pickupPoint || "No especificado"}
                      </p>
                    </div>
                    {order.deliverySnapshot?.scheduledAt && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Programado para</p>
                        <p className="text-indigo-300 text-sm font-bold">{order.deliverySnapshot.scheduledAt}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {order.deliverySnapshot?.department && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Origen / Destino</p>
                        <p className="text-slate-200 text-sm font-bold">{order.deliverySnapshot.department} {order.deliverySnapshot.city ? `• ${order.deliverySnapshot.city}` : ""}</p>
                      </div>
                    )}
                    {order.deliverySnapshot?.shippingCompany && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Transportadora</p>
                        <p className="text-slate-200 text-sm font-bold">{order.deliverySnapshot.shippingCompany}</p>
                      </div>
                    )}
                  </div>
                </div>

                {order.deliverySnapshot?.recipientName && (
                  <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-400 uppercase font-black mb-2">Datos de Recepción</p>
                    <p className="text-slate-300 text-sm underline decoration-indigo-500/50 underline-offset-4">{order.deliverySnapshot.recipientName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                       {order.deliverySnapshot.senderCI && (
                         <p className="text-slate-500 text-xs">🪪 CI: <span className="text-slate-300 font-medium">{order.deliverySnapshot.senderCI}</span></p>
                       )}
                       {order.deliverySnapshot.senderPhone && (
                         <p className="text-slate-500 text-xs">📞 Tel: <span className="text-slate-300 font-medium">{order.deliverySnapshot.senderPhone}</span></p>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {order.notes && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 relative">
                 <div className="absolute -top-3 left-6 px-3 bg-slate-900 border border-amber-500/30 rounded-full">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Notas del Cliente</span>
                 </div>
                 <p className="text-amber-200/80 text-sm italic py-2">
                   &quot;{order.notes}&quot;
                 </p>
              </div>
            )}

            {/* Audit Card */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600 mb-4 italic">Metadatos de Auditoría</h3>
              <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-500">
                <p>ORDER_ID: <span className="text-slate-400">{order._id}</span></p>
                <p>PAYMENT_ID: <span className="text-slate-400">{payment._id}</span></p>
                <p>CHANNEL: <span className="text-slate-400">{order.channel}</span></p>
                <p>METHOD: <span className="text-slate-400">{payment.metodoPago}</span></p>
              </div>
            </div>

          </div>
        </div>

        {/* Action Panel */}
        <div className="sticky bottom-6 z-40">
          {showRejectForm ? (
            <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <span className="text-red-500">⚠️</span> Justificar Rechazo
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indique al cliente por qué se rechaza el comprobante (ej. Monto incorrecto, imagen borrosa...)"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white text-sm resize-none focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-slate-600 mb-6"
                rows={4}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="flex-[2] py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-red-600/20 active:scale-[0.98]"
                >
                  {state === "rejecting" ? "Procesando..." : "Confirmar Rechazo Definitivo"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 p-2 bg-slate-900/80 border border-white/10 rounded-[2rem] backdrop-blur-2xl shadow-2xl">
              <button
                onClick={() => { setShowRejectForm(true); setErrorMsg(""); }}
                disabled={isProcessing}
                className="flex-1 py-4 px-6 rounded-[1.5rem] bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-500 font-bold transition-all border border-transparent hover:border-red-500/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                <span className="text-lg">✕</span>
                Rechazar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-[2] py-4 px-6 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                {state === "confirming" ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Conciliando...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">⚡</span>
                    <span>Confirmar Pago</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {errorMsg && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-500 text-sm text-center font-bold animate-shake">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Protocolo de Verificación Segura — Link de un solo uso
          </p>
          <div className="flex gap-6 grayscale opacity-30">
             <div className="w-12 h-6 bg-slate-800 rounded flex items-center justify-center text-[8px] font-black">QR_BOLIVIA</div>
             <div className="w-12 h-6 bg-slate-800 rounded flex items-center justify-center text-[8px] font-black">VERIFIED</div>
             <div className="w-12 h-6 bg-slate-800 rounded flex items-center justify-center text-[8px] font-black">CONTROL_V</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .scale-animation {
          animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          0% { transform: scale(0.8) opacity(0); }
          100% { transform: scale(1) opacity(1); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
