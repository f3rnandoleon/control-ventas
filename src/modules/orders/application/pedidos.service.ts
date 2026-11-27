import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import CronLock from "@/models/cronLock";
import Carrito from "@/models/carrito";
import Pedido from "@/models/pedido";
import Producto from "@/models/producto";
import User from "@/models/user";
import Sucursal from "@/models/sucursal";
import TransaccionPago from "@/models/transaccionPago";
import {
    getDefaultWarehouseId,
    getWebDispatchBranchId,
    getAvailableWebStockForVariant,
} from "@/modules/inventory/application/branch-stock.service";
import {
    resolveDefaultAccountForPayment,
    registrarMovimientoEnCuenta,
} from "@/modules/finance/application/cash-account.service";
import {
    obtenerSesionCajaActiva,
    acumularVentaEnSesion,
} from "@/modules/finance/application/cash-register-session.service";

import { getValidatedCartForCheckout, clearCartByUserId } from "@/modules/cart/application/cart.service";
import {
    obtenerDireccionClientePorUsuario,
    obtenerContextoClientePorUsuario,
} from "@/modules/clientes/application/clientes.service";
import {
    getAvailableStockForVariant,
    releaseReservedStockForOrder,
    reserveStockForOrder,
    consumeStockForSale
} from "@/modules/inventory/application/inventory.service";
import { pedidosRepository } from "@/modules/orders/infrastructure/pedidos.repository";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import {
    recordAuditEventSafe,
    type AuditActorRole,
} from "@/modules/audit/application/audit.service";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import {
    getMaxActiveReservationsPerCustomer,
    getWebReservationMinutes,
    hashReservationToken,
    isPromoExpressCheckoutEnabled,
    resolveCheckoutShippingFee,
    verifyReservationToken,
} from "@/shared/config/checkout-promo.config";
import type { CheckoutCartInput } from "@/schemas/cart.schema";
import type { UpdateEstadoPedidoInput, UpdatePedidoEntregaInput, CreatePedidoInput } from "@/schemas/pedido.schema";
import { generateOrderedId } from "@/utils/generarId";
import { assertObjectId } from "@/utils/validacion";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import type { Variante } from "@/types/producto";
import { getVariantPricing, getWebVariantPricing } from "@/utils/pricing";
import type { SalesQueryInput } from "@/schemas/sales-query.schema";
import {
    evaluateWebResolvedItems,
    normalizePhone,
    reservePromotionsForOrder,
    revertPromotionsForOrder,
} from "@/modules/promotions/application/promotions.service";
import {
  roundMoney,
  type EngineLineInput,
} from "@/modules/promotions/domain/promotion-engine";

export { hashReservationToken, verifyReservationToken };

function buildPhoneMatchVariants(phone: string): string[] {
    return Array.from(new Set([phone, `591${phone}`, `+591${phone}`]));
}

function createPedidoNumber(prefix = "P") {
    return generateOrderedId(prefix);
}

function createReservationExpirationDate(minutes = 15) {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return expiration;
}

async function releasePedidoReservation(pedido: {
    _id?: string | mongoose.Types.ObjectId;
    items: Array<{
        productoId: string | mongoose.Types.ObjectId;
        variante: {
            varianteId?: string;
            color: string;
            colorSecundario?: string;
            talla: string;
        };
        cantidad: number;
    }>;
}, session?: mongoose.ClientSession) {
    for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId).session(session ?? null);
        if (!producto) continue;

        const variante = producto.variantes.find((candidate: {
            varianteId?: string;
            color: string;
            colorSecundario?: string;
            talla: string;
        }) => {
            if (item.variante.varianteId && candidate.varianteId) {
                return candidate.varianteId === item.variante.varianteId;
            }
            return (
                candidate.color === item.variante.color &&
                (item.variante.colorSecundario === undefined ||
                    (candidate.colorSecundario || "") ===
                    (item.variante.colorSecundario || "")) &&
                candidate.talla === item.variante.talla
            );
        });

        if (!variante) continue;

        await releaseReservedStockForOrder({
            producto,
            variante,
            cantidad: item.cantidad,
            sucursalId: (pedido as unknown as { sucursalId?: mongoose.Types.ObjectId }).sucursalId,
        }, session);
    }
}

async function acquireCronLease(name: string, leaseMs: number) {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + leaseMs);
    try {
        const lock = await CronLock.findOneAndUpdate(
            {
                name,
                $or: [{ leaseUntil: { $lte: now } }, { leaseUntil: { $exists: false } }],
            },
            { $set: { leaseUntil } },
            { upsert: true, new: true, includeResultMetadata: true }
        );

        return Boolean(lock.lastErrorObject?.updatedExisting || lock.lastErrorObject?.upserted);
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
        ) {
            return false;
        }

        throw error;
    }
}

async function releaseCronLease(name: string) {
    await CronLock.updateOne(
        { name },
        { $set: { leaseUntil: new Date(0) } }
    );
}

export async function expireOrderReservationIfNeeded(
    pedidoId: string,
    options: {
        force?: boolean;
        graceSeconds?: number;
        reason?: string;
        actorId?: string | null;
        actorRole?: AuditActorRole | null;
    } = {}
) {
    await connectDB();

    return runInTransaction(async (session) => {
        const pedido = await pedidosRepository.findById(pedidoId, session);
        if (!pedido) {
            return {
                released: false,
                alreadyReleased: false,
                hasReceipt: false,
                pedido: null,
            };
        }

        const latestPayment = await TransaccionPago.findOne({ pedidoId: pedido._id })
            .sort({ createdAt: -1 })
            .session(session);
        const hasReceipt = Boolean(latestPayment?.urlComprobante);
        const reason = options.reason || "Reserva expirada por tiempo límite";

        if (
            pedido.estadoReservaStock === "RELEASED" ||
            pedido.estadoPedido === "CANCELLED"
        ) {
            if (latestPayment && latestPayment.estado === "PENDING" && !hasReceipt) {
                await TransaccionPago.updateMany(
                    { pedidoId: pedido._id, estado: "PENDING", urlComprobante: null },
                    {
                        $set: {
                            estado: "FAILED",
                            falladoEn: new Date(),
                            motivoFallo: reason,
                        },
                    },
                    { session }
                );
            }

            return {
                released: false,
                alreadyReleased: true,
                hasReceipt,
                pedido,
            };
        }

        if (
            pedido.estadoPedido !== "PENDING_PAYMENT" ||
            pedido.estadoReservaStock !== "RESERVED" ||
            pedido.estadoPago === "PAID" ||
            hasReceipt
        ) {
            return {
                released: false,
                alreadyReleased: false,
                hasReceipt,
                pedido,
            };
        }

        if (!options.force) {
            const expMs = pedido.reservaExpiraEn
                ? new Date(pedido.reservaExpiraEn).getTime()
                : null;
            const graceMs = Math.max(0, Number(options.graceSeconds || 0)) * 1000;
            if (!expMs || expMs + graceMs > Date.now()) {
                return {
                    released: false,
                    alreadyReleased: false,
                    hasReceipt: false,
                    pedido,
                };
            }
        }

        await releasePedidoReservation(pedido, session);
        await revertPromotionsForOrder(pedido._id, session);

        pedido.estadoReservaStock = "RELEASED";
        pedido.estadoPedido = "CANCELLED";
        pedido.estadoPago = "FAILED";
        pedido.estadoEntrega = "CANCELLED";
        pedido.reservadoEn = null;
        pedido.reservaExpiraEn = null;
        pedido.motivoCancelacion = reason;
        await pedido.save({ session });

        await TransaccionPago.updateMany(
            { pedidoId: pedido._id, estado: "PENDING" },
            {
                $set: {
                    estado: "FAILED",
                    falladoEn: new Date(),
                    motivoFallo: reason,
                },
            },
            { session }
        );

        await syncFulfillmentForOrder(pedido, session);

        await recordAuditEventSafe(
            {
                accion: "RESERVATION_EXPIRED",
                tipoEntidad: "PEDIDO",
                idEntidad: pedido._id.toString(),
                idActor: options.actorId || "SYSTEM",
                rolActor: options.actorRole ?? null,
                estado: "SUCCESS",
                metadata: {
                    force: Boolean(options.force),
                    reason,
                },
            },
            session
        );

        return {
            released: true,
            alreadyReleased: false,
            hasReceipt: false,
            pedido,
        };
    });
}

export async function releaseExpiredReservations(limit = 100) {
    await connectDB();
    const lockName = "release-expired-reservations";
    const lockAcquired = await acquireCronLease(lockName, 10 * 60 * 1000);
    if (!lockAcquired) {
        return {
            releasedCount: 0,
            failedCount: 0,
            remainingExpiredCount: await pedidosRepository.countExpiredReserved(),
            details: [],
            locked: true,
        };
    }

    const startedAt = Date.now();
    const maxDurationMs = 50 * 1000;
    let releasedCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    try {
        while (Date.now() - startedAt < maxDurationMs) {
            const expiredPedidos = await pedidosRepository.findExpiredReserved(limit);
            if (expiredPedidos.length === 0) break;

            let releasedInBatch = 0;
            for (const expiredPedido of expiredPedidos) {
                try {
                    const outcome = await expireOrderReservationIfNeeded(
                        expiredPedido._id.toString(),
                        {
                            force: false,
                            graceSeconds: 0,
                            reason: "Reserva expirada automáticamente (cron)",
                        }
                    );

                    if (outcome.released) {
                        releasedCount += 1;
                        releasedInBatch += 1;
                        details.push(expiredPedido._id.toString());
                    }
                } catch {
                    failedCount += 1;
                }
            }

            if (releasedInBatch === 0) break;
        }

        return {
            releasedCount,
            failedCount,
            remainingExpiredCount: await pedidosRepository.countExpiredReserved(),
            details,
            locked: false,
        };
    } finally {
        await releaseCronLease(lockName);
    }
}

/**
 * Barrido ligero y throttled (sin cron externo) invocado desde consultas públicas de catálogo.
 * El lease en CronLock actúa como ventana mínima de espera entre ejecuciones.
 */
export async function sweepExpiredReservationsThrottled(options?: {
    minIntervalMs?: number;
    limit?: number;
    maxDurationMs?: number;
}) {
    const minIntervalMs = options?.minIntervalMs ?? 60_000;
    const limit = options?.limit ?? 15;
    const maxDurationMs = options?.maxDurationMs ?? 2_500;

    try {
        await connectDB();
        const lockAcquired = await acquireCronLease(
            "lazy-expired-reservations-sweep",
            minIntervalMs
        );
        if (!lockAcquired) {
            return { ran: false, releasedCount: 0 };
        }

        const startedAt = Date.now();
        const expiredPedidos = await pedidosRepository.findExpiredReserved(limit);
        let releasedCount = 0;

        for (const expiredPedido of expiredPedidos) {
            if (Date.now() - startedAt >= maxDurationMs) break;
            try {
                const outcome = await expireOrderReservationIfNeeded(
                    expiredPedido._id.toString(),
                    {
                        force: false,
                        graceSeconds: 0,
                        reason: "Reserva expirada liberada automáticamente",
                    }
                );
                if (outcome.released) {
                    releasedCount += 1;
                }
            } catch {
                // Fallo aislado en un pedido no debe afectar el catálogo público
            }
        }

        return { ran: true, releasedCount };
    } catch (error) {
        console.warn("[LazySweep] Error al barrer reservas expiradas:", error);
        return { ran: false, releasedCount: 0 };
    }
}

/**
 * Libera inmediatamente cualquier reserva expirada que esté bloqueando alguno de los productos
 * solicitados en un nuevo checkout, eliminando el stock fantasma sin depender del cron.
 */
export async function releaseExpiredReservationsForProductIds(
    productIds: string[],
    limit = 10
): Promise<number> {
    const validIds = Array.from(
        new Set(productIds.filter((id) => mongoose.Types.ObjectId.isValid(id)))
    ).map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) return 0;

    try {
        await connectDB();
        const expiredDocs = await Pedido.find({
            estadoReservaStock: "RESERVED",
            estadoPedido: "PENDING_PAYMENT",
            reservaExpiraEn: { $lt: new Date() },
            "items.productoId": { $in: validIds },
        })
            .select("_id")
            .sort({ reservaExpiraEn: 1 })
            .limit(limit)
            .lean();

        let releasedCount = 0;
        for (const doc of expiredDocs) {
            try {
                const outcome = await expireOrderReservationIfNeeded(
                    String(doc._id),
                    {
                        force: false,
                        graceSeconds: 0,
                        reason: "Reserva expirada liberada automáticamente en checkout",
                    }
                );
                if (outcome.released) releasedCount += 1;
            } catch {
                // Continuar con los demás
            }
        }
        return releasedCount;
    } catch (error) {
        console.warn("[PreCheckoutSweep] Error liberando reservas expiradas:", error);
        return 0;
    }
}

type ReservationActor = {
    userId?: string | null;
    role?: string | null;
    token?: string | null;
};

function resolvePedidoClienteId(pedido: { cliente?: unknown }): string | null {
    if (!pedido.cliente) return null;
    if (typeof pedido.cliente === "string") return pedido.cliente;
    if (pedido.cliente instanceof mongoose.Types.ObjectId) {
        return pedido.cliente.toString();
    }
    if (
        typeof pedido.cliente === "object" &&
        pedido.cliente !== null &&
        "_id" in pedido.cliente &&
        pedido.cliente._id
    ) {
        return String(pedido.cliente._id);
    }
    return null;
}

function assertReservationAccess(
    pedido: { cliente?: unknown; reservationTokenHash?: string | null },
    actor: ReservationActor
) {
    if (actor.role && ["ADMIN", "VENDEDOR"].includes(actor.role)) {
        return;
    }

    const clienteId = resolvePedidoClienteId(pedido);
    if (actor.userId && clienteId && clienteId === actor.userId) {
        return;
    }

    if (verifyReservationToken(actor.token, pedido.reservationTokenHash)) {
        return;
    }

    if (!actor.userId && !actor.token) {
        throw new AppError(
            "Se requiere autenticación o token de reserva válido",
            401,
            "RESERVATION_AUTH_REQUIRED"
        );
    }

    throw new AppError(
        "Token de reserva inválido o sin permisos para este pedido",
        403,
        "INVALID_RESERVATION_TOKEN"
    );
}

export async function getOrderReservationStatus(
    pedidoId: string,
    actor: ReservationActor
) {
    assertObjectId(pedidoId, "ID de pedido invalido");
    await connectDB();

    const initialPedido = await pedidosRepository.findById(pedidoId);
    if (!initialPedido) {
        throw new AppError("Pedido no encontrado", 404);
    }

    assertReservationAccess(initialPedido, actor);

    const expirationOutcome = await expireOrderReservationIfNeeded(pedidoId, {
        force: false,
        graceSeconds: 0,
        reason: "Reserva expirada al consultar estado",
        actorId: actor.userId || "INVITADO",
        actorRole: actor.userId ? "CLIENTE" : null,
    });

    const pedido = expirationOutcome.pedido || initialPedido;
    const latestPayment = await TransaccionPago.findOne({ pedidoId: pedido._id })
        .sort({ createdAt: -1 })
        .lean<{ _id: mongoose.Types.ObjectId; urlComprobante?: string | null; estado?: string } | null>();

    const hasReceipt = Boolean(latestPayment?.urlComprobante);
    const expiresAtDate = pedido.reservaExpiraEn ? new Date(pedido.reservaExpiraEn) : null;
    const isPastExpiration =
        !hasReceipt && expiresAtDate !== null && expiresAtDate.getTime() <= Date.now();
    const expired =
        pedido.estadoPedido === "CANCELLED" ||
        pedido.estadoReservaStock === "RELEASED" ||
        isPastExpiration;
    const valid =
        !expired &&
        (pedido.estadoPedido === "PENDING_PAYMENT" || pedido.estadoPedido === "CONFIRMED") &&
        (pedido.estadoReservaStock === "RESERVED" || pedido.estadoReservaStock === "CONSUMED");

    return {
        ok: true,
        orderId: pedido._id.toString(),
        orderNumber: pedido.numeroPedido,
        paymentId: latestPayment ? latestPayment._id.toString() : null,
        valid,
        expired,
        hasReceipt,
        estadoPedido: pedido.estadoPedido,
        estadoPago: pedido.estadoPago,
        estadoReservaStock: pedido.estadoReservaStock,
        expiresAt: expiresAtDate ? expiresAtDate.toISOString() : null,
        subtotal: pedido.subtotal,
        descuento: pedido.descuento,
        descuentoEnvio: pedido.descuentoEnvio || 0,
        costoEnvio: pedido.costoEnvio || 0,
        total: pedido.total,
    };
}

export async function expireOrderReservationByActor(
    pedidoId: string,
    actor: ReservationActor
) {
    assertObjectId(pedidoId, "ID de pedido invalido");
    await connectDB();

    const initialPedido = await pedidosRepository.findById(pedidoId);
    if (!initialPedido) {
        throw new AppError("Pedido no encontrado", 404);
    }

    assertReservationAccess(initialPedido, actor);

    const outcome = await expireOrderReservationIfNeeded(pedidoId, {
        force: true,
        reason: "Reserva expirada por tiempo límite en checkout",
        actorId: actor.userId || "INVITADO",
        actorRole: actor.userId ? "CLIENTE" : null,
    });

    const pedido = outcome.pedido || initialPedido;

    return {
        ok: true,
        orderId: pedido._id.toString(),
        orderNumber: pedido.numeroPedido,
        released: outcome.released || outcome.alreadyReleased,
        alreadyReleased: outcome.alreadyReleased,
        hasReceipt: outcome.hasReceipt,
        estadoPedido: pedido.estadoPedido,
        estadoPago: pedido.estadoPago,
        estadoReservaStock: pedido.estadoReservaStock,
    };
}

export async function crearPedidoCheckout(
    customerId: string | null,
    payload: CheckoutCartInput
) {
    await connectDB();

    let customer: Awaited<ReturnType<typeof obtenerContextoClientePorUsuario>> | null = null;
    if (customerId) {
        assertObjectId(customerId, "Usuario no valido");
        customer = await obtenerContextoClientePorUsuario(customerId, {
            ensureProfile: true,
        });
    }

    const isGuest = !customerId || Boolean(payload.esInvitado || payload.clienteInvitado);
    const promoExpress = isPromoExpressCheckoutEnabled();
    const metodoEntrega = payload.entrega?.metodo ?? null;
    const { costoEnvio: costoEnvioBase, department: resolvedDepartment } =
        resolveCheckoutShippingFee({
            metodoEntrega,
            departamento: payload.entrega?.departamento,
        });

    let snapshotEntrega: Record<string, unknown> | null = null;

    if (metodoEntrega === "WHATSAPP") {
        const nombreDestinatario =
            payload.entrega?.nombreDestinatario ||
            payload.clienteInvitado?.nombreCompleto ||
            customer?.user.nombreCompleto ||
            null;
        const telefonoContacto =
            payload.entrega?.telefono ||
            payload.clienteInvitado?.telefono ||
            customer?.profile?.telefono ||
            customer?.defaultAddress?.telefono ||
            null;

        if (promoExpress && payload.metodoPago === "QR") {
            if (!nombreDestinatario) {
                throw new AppError("El nombre completo es obligatorio", 400);
            }
            if (!telefonoContacto) {
                throw new AppError("El celular de contacto es obligatorio", 400);
            }
        }

        snapshotEntrega = {
            metodo: "WHATSAPP",
            departamento:
                resolvedDepartment.canonicalName ||
                payload.entrega?.departamento ||
                "La Paz",
            ciudad:
                payload.entrega?.ciudad ||
                resolvedDepartment.canonicalName ||
                payload.entrega?.departamento ||
                "La Paz",
            nombreDestinatario,
            telefono: telefonoContacto,
        };
    } else if (metodoEntrega === "PICKUP_POINT") {
        snapshotEntrega = {
            metodo: "PICKUP_POINT",
            puntoRecojo: payload.entrega?.direccion ?? null,
            telefono: payload.entrega?.telefono || payload.clienteInvitado?.telefono || customer?.profile?.telefono || customer?.defaultAddress?.telefono || null,
            nombreDestinatario: payload.entrega?.nombreDestinatario || payload.clienteInvitado?.nombreCompleto || customer?.user.nombreCompleto || "Cliente",
            programadoPara: payload.entrega?.programadoPara ?? null,
        };
    } else if (metodoEntrega === "SHIPPING_NATIONAL") {
        const nombreDestinatario =
            payload.entrega?.nombreDestinatario ||
            payload.entrega?.nombreRemitente ||
            payload.clienteInvitado?.nombreCompleto ||
            customer?.user.nombreCompleto ||
            null;
        const telefonoContacto =
            payload.entrega?.telefono ||
            payload.entrega?.telefonoRemitente ||
            payload.clienteInvitado?.telefono ||
            customer?.profile?.telefono ||
            customer?.defaultAddress?.telefono ||
            null;

        if (promoExpress) {
            if (!nombreDestinatario) {
                throw new AppError("El nombre completo es obligatorio", 400);
            }
            if (!telefonoContacto) {
                throw new AppError("El celular de contacto es obligatorio", 400);
            }
        }

        const departamentoFinal =
            resolvedDepartment.canonicalName || payload.entrega?.departamento || null;

        snapshotEntrega = {
            metodo: "SHIPPING_NATIONAL",
            departamento: departamentoFinal,
            ciudad: payload.entrega?.ciudad || departamentoFinal,
            empresaEnvio:
                payload.entrega?.empresaEnvio ||
                (promoExpress ? "Por coordinar por WhatsApp" : null),
            sucursal:
                payload.entrega?.sucursal ||
                (promoExpress ? "Por coordinar por WhatsApp" : null),
            telefono: telefonoContacto,
            nombreRemitente:
                payload.entrega?.nombreRemitente || nombreDestinatario,
            ciRemitente:
                payload.entrega?.ciRemitente ||
                payload.clienteInvitado?.ci ||
                customer?.profile?.numeroDocumento ||
                null,
            telefonoRemitente:
                payload.entrega?.telefonoRemitente || telefonoContacto,
            nombreDestinatario,
        };
    } else if (payload.direccionId && customerId) {
        const address = await obtenerDireccionClientePorUsuario(customerId, payload.direccionId);
        snapshotEntrega = {
            metodo: "PICKUP_POINT",
            puntoRecojo: payload.entrega?.direccion || address.direccion,
            telefono: payload.entrega?.telefono || address.telefono,
            nombreDestinatario: payload.entrega?.nombreDestinatario || address.nombreDestinatario,
        };
    } else if (customer?.defaultAddress) {
        snapshotEntrega = {
            metodo: "PICKUP_POINT",
            puntoRecojo: customer.defaultAddress.direccion,
            telefono: customer.defaultAddress.telefono,
            nombreDestinatario: customer.defaultAddress.nombreDestinatario,
        };
    }

    // Liberar reservas vencidas antes de validar límites/stock (auto-limpieza sin cron externo)
    if (payload.items && payload.items.length > 0) {
        await releaseExpiredReservationsForProductIds(
            payload.items.map((item) => item.productoId)
        );
    } else if (customerId) {
        const cartDoc = await Carrito.findOne({ cliente: customerId })
            .select("items.productoId")
            .lean<{ items?: Array<{ productoId?: mongoose.Types.ObjectId }> } | null>();
        const cartProductIds = (cartDoc?.items || [])
            .map((it) => (it.productoId ? it.productoId.toString() : ""))
            .filter(Boolean);
        if (cartProductIds.length > 0) {
            await releaseExpiredReservationsForProductIds(cartProductIds);
        } else {
            await sweepExpiredReservationsThrottled({ minIntervalMs: 30_000, limit: 10 });
        }
    } else {
        await sweepExpiredReservationsThrottled({ minIntervalMs: 30_000, limit: 10 });
    }

    // Protección anti-abuso persistente en MongoDB: limitar reservas activas simultáneas por cliente/teléfono
    const telefonoAntiAbuse =
        (snapshotEntrega?.telefono as string) ||
        (snapshotEntrega?.telefonoRemitente as string) ||
        payload.clienteInvitado?.telefono ||
        customer?.profile?.telefono ||
        customer?.defaultAddress?.telefono ||
        null;
    const normalizedPhoneAntiAbuse = normalizePhone(telefonoAntiAbuse);
    const activeReservationIdentityOr: Record<string, unknown>[] = [];
    if (customer?.user._id) {
        activeReservationIdentityOr.push({ cliente: customer.user._id });
    }
    if (normalizedPhoneAntiAbuse) {
        const phoneVariants = buildPhoneMatchVariants(normalizedPhoneAntiAbuse);
        activeReservationIdentityOr.push({
            "snapshotCliente.telefono": { $in: phoneVariants },
        });
        activeReservationIdentityOr.push({
            "datosClienteInvitado.telefono": { $in: phoneVariants },
        });
    }
    if (activeReservationIdentityOr.length > 0) {
        const activeReservationsCount = await Pedido.countDocuments({
            canal: "WEB",
            estadoPedido: "PENDING_PAYMENT",
            estadoReservaStock: "RESERVED",
            reservaExpiraEn: { $gt: new Date() },
            $or: activeReservationIdentityOr,
        });
        if (activeReservationsCount >= getMaxActiveReservationsPerCustomer()) {
            throw new AppError(
                "Ya tienes reservas pendientes activas. Completa tu pago o espera a que expiren antes de crear otro pedido.",
                429,
                "TOO_MANY_ACTIVE_RESERVATIONS"
            );
        }
    }

    const reservationMinutes =
        payload.metodoPago === "QR" ? getWebReservationMinutes() : 60 * 48;
    const reservationToken = randomUUID();
    const reservationTokenHash = hashReservationToken(reservationToken);

    const result = await runInTransaction(async (session) => {
        const webDispatchBranchId = await getWebDispatchBranchId(session);
        const checkoutNow = new Date();
        let cartCuponCodigo: string | null = null;
        const rawPreparedItems: Array<{
            productoId: mongoose.Types.ObjectId;
            variante: {
                varianteId?: string;
                color: string;
                colorSecundario?: string;
                talla: string;
                codigoBarra?: string;
                qrCode?: string;
            };
            productoSnapshot: {
                nombre: string;
                modelo?: string;
                sku?: string;
                imagen?: string;
            };
            engineLine: EngineLineInput;
        }> = [];

        if (payload.items && payload.items.length > 0) {
            for (const itemInput of payload.items) {
                assertObjectId(itemInput.productoId, "ID de producto inválido");
                const producto = await Producto.findById(itemInput.productoId).session(session ?? null);
                if (!producto || producto.estado === "INACTIVO") {
                    throw new AppError("Producto no disponible", 400);
                }

                const variantes = (producto.variantes || []) as unknown as Variante[];
                const variante = findVariantByIdentity(variantes, {
                    varianteId: itemInput.variantId || undefined,
                    color: itemInput.color,
                    talla: itemInput.talla,
                });

                if (!variante) {
                    throw new AppError(
                        `Variante no encontrada para ${producto.nombre} (${itemInput.color} - ${itemInput.talla})`,
                        400
                    );
                }

                const varId = variante.varianteId || String((variante as unknown as { _id?: unknown })._id || "");
                const variantAvailable = getAvailableStockForVariant(variante);
                const stockDisponibleWeb = await getAvailableWebStockForVariant(
                    producto._id,
                    varId,
                    session,
                    variantAvailable
                );
                if (stockDisponibleWeb < itemInput.cantidad || variantAvailable < itemInput.cantidad) {
                    throw new AppError(
                        `Stock insuficiente para ${producto.nombre} ${variante.color}/${variante.talla}`,
                        400
                    );
                }

                await reserveStockForOrder(
                    {
                        producto,
                        variante,
                        cantidad: itemInput.cantidad,
                        sucursalId: webDispatchBranchId,
                    },
                    session
                );

                const webPricing = getWebVariantPricing(producto, variante, checkoutNow);

                rawPreparedItems.push({
                    productoId: producto._id,
                    variante: {
                        varianteId: variante.varianteId,
                        color: variante.color,
                        colorSecundario: variante.colorSecundario,
                        talla: variante.talla,
                        codigoBarra: variante.codigoBarra,
                        qrCode: variante.qrCode,
                    },
                    productoSnapshot: {
                        nombre: producto.nombre,
                        modelo: producto.modelo,
                        sku: producto.sku,
                        imagen: (variante.imagenes && variante.imagenes[0]) || variante.imagen || producto.imagen,
                    },
                    engineLine: {
                        productoId: producto._id.toString(),
                        varianteId: variante.varianteId,
                        color: variante.color,
                        colorSecundario: variante.colorSecundario,
                        talla: variante.talla,
                        categoria: producto.categoria,
                        cantidad: itemInput.cantidad,
                        precioUnitarioLista: webPricing.precioLista,
                        precioWebEfectivo: webPricing.precioVenta,
                        precioCosto: webPricing.precioCosto,
                        tieneRebajaCatalogo: webPricing.tieneRebaja,
                    },
                });
            }
        } else if (customerId) {
            const { cart, validatedItems } = await getValidatedCartForCheckout(customerId, session);
            cartCuponCodigo = cart.cuponCodigo || null;

            for (const { producto, variante, cartItem, webPricing } of validatedItems) {
                if (getAvailableStockForVariant(variante) < cartItem.cantidad) {
                    throw new AppError(
                        `Stock insuficiente para ${producto.nombre} ${variante.color}/${variante.talla}`,
                        400
                    );
                }
                await reserveStockForOrder(
                    {
                        producto,
                        variante,
                        cantidad: cartItem.cantidad,
                        sucursalId: webDispatchBranchId,
                    },
                    session
                );

                rawPreparedItems.push({
                    productoId: producto._id,
                    variante: {
                        varianteId: variante.varianteId,
                        color: variante.color,
                        colorSecundario: variante.colorSecundario,
                        talla: variante.talla,
                        codigoBarra: variante.codigoBarra,
                        qrCode: variante.qrCode,
                    },
                    productoSnapshot: {
                        nombre: producto.nombre,
                        modelo: producto.modelo,
                        sku: producto.sku,
                        imagen: cartItem.productoSnapshot.imagen,
                    },
                    engineLine: {
                        productoId: producto._id.toString(),
                        varianteId: variante.varianteId,
                        color: variante.color,
                        colorSecundario: variante.colorSecundario,
                        talla: variante.talla,
                        categoria: producto.categoria,
                        cantidad: cartItem.cantidad,
                        precioUnitarioLista: webPricing.precioLista,
                        precioWebEfectivo: webPricing.precioVenta,
                        precioCosto: webPricing.precioCosto,
                        tieneRebajaCatalogo: webPricing.tieneRebaja,
                    },
                });
            }
        } else {
            throw new AppError("No se proporcionaron items para el pedido", 400);
        }

        const telefonoContactoEvaluacion =
            (snapshotEntrega?.telefono as string) ||
            (snapshotEntrega?.telefonoRemitente as string) ||
            payload.clienteInvitado?.telefono ||
            customer?.profile?.telefono ||
            customer?.defaultAddress?.telefono ||
            null;

        const cuponCodigoFinal = payload.cuponCodigo || cartCuponCodigo || null;

        const pricingEvaluation = await evaluateWebResolvedItems({
            items: rawPreparedItems.map((item) => item.engineLine),
            costoEnvio: costoEnvioBase,
            cuponCodigo: cuponCodigoFinal,
            clienteId: customer ? customer.user._id.toString() : null,
            telefonoInvitado: telefonoContactoEvaluacion,
            session,
            now: checkoutNow,
        });

        if (cuponCodigoFinal && !pricingEvaluation.cuponValido) {
            throw new AppError(
                pricingEvaluation.cuponErrorMensaje ||
                    `El cupón "${cuponCodigoFinal}" no es válido para este pedido`,
                400
            );
        }

        const itemsProcesados = rawPreparedItems.map((prepared, idx) => {
            const evaluated = pricingEvaluation.items[idx];
            return {
                productoId: prepared.productoId,
                variante: prepared.variante,
                productoSnapshot: prepared.productoSnapshot,
                cantidad: evaluated.cantidad,
                precioUnitario: evaluated.precioUnitarioLista,
                precioUnitarioLista: evaluated.precioUnitarioLista,
                descuentoCatalogo: evaluated.descuentoCatalogo,
                descuentoLinea: evaluated.descuentoLinea,
                descuentoProrrateado: evaluated.descuentoProrrateado,
                totalLinea: evaluated.totalLineaBruto,
                totalLineaNeto: evaluated.totalLineaNeto,
                precioCosto: evaluated.precioCosto,
                ganancia: evaluated.gananciaNeta,
            };
        });

        const subtotal = pricingEvaluation.subtotalLista;
        const costoEnvio = pricingEvaluation.costoEnvioOriginal;
        const descuentoEnvio = pricingEvaluation.descuentoEnvio;
        const descuento = pricingEvaluation.descuentoTotal;
        const total = pricingEvaluation.totalFinal;
        const gananciaTotal = pricingEvaluation.gananciaTotalNeta;
        const estadoEntrega = metodoEntrega === "WHATSAPP" ? "NOT_APPLICABLE" : "PENDING";

        const snapshotCliente = customer
            ? {
                usuarioId: customer.user._id,
                nombreCompleto:
                    (snapshotEntrega?.nombreDestinatario as string) ||
                    customer.user.nombreCompleto,
                email: customer.user.email,
                telefono:
                    (snapshotEntrega?.telefono as string) ||
                    (snapshotEntrega?.telefonoRemitente as string) ||
                    customer.profile?.telefono ||
                    customer.defaultAddress?.telefono ||
                    null,
                tipoDocumento: customer.profile?.tipoDocumento || null,
                numeroDocumento: customer.profile?.numeroDocumento || null,
            }
            : {
                usuarioId: null,
                nombreCompleto:
                    payload.clienteInvitado?.nombreCompleto ||
                    (snapshotEntrega?.nombreDestinatario as string) ||
                    "Cliente Invitado",
                email: payload.clienteInvitado?.email || null,
                telefono:
                    payload.clienteInvitado?.telefono ||
                    (snapshotEntrega?.telefono as string) ||
                    (snapshotEntrega?.telefonoRemitente as string) ||
                    null,
                tipoDocumento: payload.clienteInvitado?.ci ? "CI" : null,
                numeroDocumento: payload.clienteInvitado?.ci || null,
            };

        const datosClienteInvitado = payload.clienteInvitado
            ? {
                nombreCompleto: payload.clienteInvitado.nombreCompleto,
                telefono: payload.clienteInvitado.telefono,
                email: payload.clienteInvitado.email || null,
                ci: payload.clienteInvitado.ci || null,
                origen: "WEB",
            }
            : undefined;

        const pedido = await pedidosRepository.create({
            numeroPedido: createPedidoNumber("WEB"),
            canal: "WEB",
            sucursalId: webDispatchBranchId,
            estadoPedido: "PENDING_PAYMENT",
            estadoPago: "PENDING",
            estadoEntrega,
            estadoReservaStock: "RESERVED",
            reservadoEn: new Date(),
            reservaExpiraEn: createReservationExpirationDate(reservationMinutes),
            metodoPago: payload.metodoPago,
            cliente: customer ? customer.user._id : null,
            vendedor: null,
            snapshotCliente,
            datosClienteInvitado,
            snapshotEntrega,
            items: itemsProcesados,
            subtotal,
            costoEnvio,
            descuento,
            descuentoEnvio,
            descuentoCatalogo: pricingEvaluation.descuentoCatalogo,
            descuentoPromociones: pricingEvaluation.descuentoPromociones,
            cuponCodigo: pricingEvaluation.cuponValido ? pricingEvaluation.cuponCodigo : null,
            promocionesAplicadas: pricingEvaluation.promocionesAplicadas,
            total,
            gananciaTotal,
            reservationTokenHash,
            notas: payload.notas || null,
        }, session);

        if (pricingEvaluation.promocionesAplicadas.length > 0) {
            await reservePromotionsForOrder(
                pricingEvaluation.promocionesAplicadas,
                pedido._id,
                {
                    clienteId: customer ? customer.user._id.toString() : null,
                    telefonoInvitado: telefonoContactoEvaluacion,
                },
                session
            );
        }

        await syncFulfillmentForOrder(pedido, session);

        if (customerId && (!payload.items || payload.items.length === 0)) {
            await clearCartByUserId(customerId, session);
        }

        // Crear orden de pago asociada (TransaccionPago)
        const numeroPago = generateOrderedId("PAGO");
        const nuevaTransaccion = new TransaccionPago({
            numeroPago,
            pedidoId: pedido._id,
            cliente: customer ? customer.user._id : null,
            metodoPago: payload.metodoPago,
            monto: pedido.total,
            estado: "PENDING",
        });
        await nuevaTransaccion.save({ session });

        await recordAuditEventSafe(
            {
                accion: "PEDIDO_CHECKOUT",
                tipoEntidad: "PEDIDO",
                idEntidad: pedido._id.toString(),
                idActor: customerId || "INVITADO",
                rolActor: customerId ? "CLIENTE" : null,
                estado: "SUCCESS",
                metadata: {
                    canal: pedido.canal,
                    esInvitado: isGuest,
                    metodoEntrega,
                    total: pedido.total,
                    items: pedido.items.length,
                    sucursalId: webDispatchBranchId.toString(),
                },
            },
            session
        );

        return { pedido, pago: nuevaTransaccion, reservationToken };
    });

    return result;
}

export async function crearPedidoDesdeCarrito(
    customerId: string,
    payload: CheckoutCartInput
) {
    const { pedido } = await crearPedidoCheckout(customerId, payload);
    return pedido;
}

export async function crearVentaDirecta(
    actor: { id: string; rol: "ADMIN" | "VENDEDOR" },
    payload: CreatePedidoInput
) {
    await connectDB();

    return runInTransaction(async (session) => {
        // Determinar sucursal: payload -> usuario asignado -> almacén por defecto
        let targetSucursalId: mongoose.Types.ObjectId;
        if (payload.sucursalId && mongoose.Types.ObjectId.isValid(payload.sucursalId)) {
            targetSucursalId = new mongoose.Types.ObjectId(payload.sucursalId);
        } else {
            const user = await User.findById(actor.id).session(session);
            if (user?.sucursalAsignadaId) {
                targetSucursalId = user.sucursalAsignadaId as mongoose.Types.ObjectId;
            } else {
                targetSucursalId = await getDefaultWarehouseId(session);
            }
        }

        // Si la venta es de mostrador (POS), validar obligatoriedad de sesión de caja abierta según configuración de sucursal
        if (payload.canal === "TIENDA" || payload.canal === "APP_QR") {
            const sucursalDoc = await Sucursal.findById(targetSucursalId).session(session);
            const exigeCaja = sucursalDoc?.requiereAperturaCaja ?? true;

            if (exigeCaja) {
                const sesionActiva = await obtenerSesionCajaActiva(targetSucursalId.toString(), session);
                if (!sesionActiva) {
                    throw new AppError(
                        "Apertura de caja obligatoria: No existe una sesión de caja abierta en esta tienda. Debe realizar la apertura de caja antes de registrar ventas.",
                        400
                    );
                }
            }
        }

        let subtotal = 0;
        const rawItemsProcesados = [];

        for (const item of payload.items) {
            const producto = await Producto.findById(item.productoId).session(session);
            if (!producto) throw new AppError(`Producto no encontrado`, 404);

            const variante = findVariantByIdentity(producto.variantes as Variante[], {
                varianteId: item.varianteId,
                color: item.color,
                colorSecundario: item.colorSecundario,
                talla: item.talla,
            });

            if (!variante) throw new AppError(`Variante no encontrada`, 404);
            if (getAvailableStockForVariant(variante) < item.cantidad) {
                throw new AppError(`Stock insuficiente`, 400);
            }

            await consumeStockForSale({
                producto,
                variante,
                cantidad: item.cantidad,
                userId: actor.id,
                sucursalId: targetSucursalId,
                motivo: `Venta directa ${payload.canal}`,
                referencia: "VENTA_DIRECTA"
            }, session);

            const pricing = getVariantPricing(producto, variante);
            const precioUnitario = pricing.precioVenta;
            const precioCosto = pricing.precioCosto;
            const totalLinea = roundMoney(precioUnitario * item.cantidad);

            subtotal = roundMoney(subtotal + totalLinea);

            rawItemsProcesados.push({
                productoId: producto._id,
                variante: {
                    varianteId: variante.varianteId,
                    color: variante.color,
                    colorSecundario: variante.colorSecundario,
                    talla: variante.talla,
                    codigoBarra: variante.codigoBarra,
                    qrCode: variante.qrCode,
                },
                productoSnapshot: {
                    nombre: producto.nombre,
                    modelo: producto.modelo,
                    sku: producto.sku,
                    imagen: variante.imagenes?.[0] || producto.imagenes?.[0],
                },
                cantidad: item.cantidad,
                precioUnitario,
                totalLinea,
                precioCosto,
            });
        }

        const descuentoAplicado = roundMoney(
            Math.min(Math.max(0, Number(payload.descuento || 0)), subtotal)
        );
        let descuentoAsignado = 0;
        const itemsProcesados = rawItemsProcesados.map((item, idx) => {
            const isLast = idx === rawItemsProcesados.length - 1;
            const descuentoProrrateado =
                descuentoAplicado <= 0 || subtotal <= 0
                    ? 0
                    : isLast
                        ? roundMoney(Math.min(item.totalLinea, descuentoAplicado - descuentoAsignado))
                        : roundMoney(
                            Math.min(item.totalLinea, (descuentoAplicado * item.totalLinea) / subtotal)
                          );
            descuentoAsignado = roundMoney(descuentoAsignado + descuentoProrrateado);
            const totalLineaNeto = roundMoney(Math.max(0, item.totalLinea - descuentoProrrateado));
            const costoLinea = roundMoney(item.precioCosto * item.cantidad);
            const ganancia = roundMoney(totalLineaNeto - costoLinea);

            return {
                ...item,
                descuentoProrrateado,
                totalLineaNeto,
                ganancia,
            };
        });

        const total = roundMoney(Math.max(0, subtotal - descuentoAplicado));
        const gananciaTotal = roundMoney(
            itemsProcesados.reduce((sum, item) => sum + item.ganancia, 0)
        );

        const pedido = await pedidosRepository.create({
            numeroPedido: createPedidoNumber(),
            canal: payload.canal,
            sucursalId: targetSucursalId,
            estadoPedido: "DELIVERED",
            estadoPago: "PAID",
            estadoEntrega: "NOT_APPLICABLE",
            estadoReservaStock: "CONSUMED",
            metodoPago: payload.metodoPago,
            cliente: null,
            vendedor: actor.id,
            items: itemsProcesados,
            subtotal,
            descuento: descuentoAplicado,
            total,
            gananciaTotal,
        }, session);

        // Registrar ingreso automático en la cuenta de dinero correspondiente (Caja física o Banco/QR)
        if (total > 0) {
            const cuentaDestino = await resolveDefaultAccountForPayment(
                payload.metodoPago as "EFECTIVO" | "QR" | "TRANSFERENCIA" | "TARJETA",
                targetSucursalId,
                session
            );
            if (cuentaDestino) {
                await registrarMovimientoEnCuenta(
                    {
                        cuentaId: cuentaDestino._id,
                        tipo: "INGRESO",
                        monto: total,
                        concepto: `Cobro Venta ${pedido.numeroPedido} (${payload.canal} - ${payload.metodoPago})`,
                        origenTipo: "VENTA_PEDIDO",
                        origenId: pedido._id.toString(),
                        sucursalId: targetSucursalId,
                        usuarioId: actor.id,
                    },
                    session
                );
            }
        }

        // Acumular venta en la sesión de caja si aplica
        if (payload.canal === "TIENDA" || payload.canal === "APP_QR") {
            await acumularVentaEnSesion(
                {
                    sucursalId: targetSucursalId,
                    total: pedido.total,
                    metodoPago: payload.metodoPago,
                },
                session
            );
        }

        await recordAuditEventSafe({
            accion: "VENTA_DIRECTA_CREADA",
            tipoEntidad: "PEDIDO",
            idEntidad: pedido._id.toString(),
            idActor: actor.id,
            rolActor: actor.rol,
            estado: "SUCCESS",
            metadata: {
                subtotal,
                descuento: descuentoAplicado,
                total: pedido.total,
                gananciaTotal,
                canal: pedido.canal,
                sucursalId: targetSucursalId.toString(),
            }
        }, session);

        return pedido;
    });
}

export function sanitizePedidoForCustomer(pedido: Record<string, unknown>) {
    const sanitized = { ...pedido };
    if (Array.isArray(sanitized.items)) {
        sanitized.items = sanitized.items.map((item: Record<string, unknown>) => {
            const rest = { ...item };
            delete rest.precioCosto;
            delete rest.ganancia;
            return rest;
        });
    }
    delete sanitized.gananciaTotal;
    delete sanitized.reservationTokenHash;
    return sanitized;
}

export async function listPedidosForActor(role: string, userId: string) {
    await connectDB();

    if (role === "CLIENTE") {
        const pedidos = await pedidosRepository.listByCustomer(userId);
        return pedidos.map(p => sanitizePedidoForCustomer(p.toObject()));
    }

    if (["ADMIN", "VENDEDOR"].includes(role)) {
        return pedidosRepository.listAll();
    }

    throw new AppError("No autorizado", 403);
}

export async function listRecognizedSalesForActor(role: string, userId: string) {
    await connectDB();

    if (role === "ADMIN") {
        return pedidosRepository.listRecognizedSales();
    }

    if (role === "VENDEDOR") {
        return pedidosRepository.listRecognizedSalesBySeller(userId);
    }

    throw new AppError("No autorizado", 403);
}

const boliviaDayBoundaryUtc = (date: string, addDay = false) => {
    const boundary = new Date(`${date}T04:00:00.000Z`);
    if (addDay) boundary.setUTCDate(boundary.getUTCDate() + 1);
    return boundary;
};

export async function listRecognizedSalesPageForActor(
    role: string,
    userId: string,
    query: SalesQueryInput
) {
    await connectDB();
    const filters = {
        page: query.page,
        limit: query.limit,
        from: query.from ? boliviaDayBoundaryUtc(query.from) : undefined,
        toExclusive: query.to ? boliviaDayBoundaryUtc(query.to, true) : undefined,
        customer: query.customer,
        seller: query.seller,
        paymentMethod: query.paymentMethod,
    };
    const result = role === "ADMIN"
        ? await pedidosRepository.listRecognizedSales(filters)
        : role === "VENDEDOR"
            ? await pedidosRepository.listRecognizedSalesBySeller(userId, filters)
            : null;
    if (!result || !("items" in result)) throw new AppError("No autorizado", 403);
    return {
        items: result.items,
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.limit)),
    };
}

export async function getPedidoForActor(role: string, userId: string, id: string) {
    assertObjectId(id, "ID de pedido invalido");
    await connectDB();

    const pedido =
        role === "CLIENTE"
            ? await pedidosRepository.findByIdForCustomer(id, userId)
            : await pedidosRepository.findById(id);

    if (!pedido) {
        throw new AppError("Pedido no encontrado", 404);
    }

    return role === "CLIENTE" ? sanitizePedidoForCustomer(pedido.toObject()) : pedido;
}

export async function updateEstadoPedidoForStaff(
    id: string,
    payload: UpdateEstadoPedidoInput
) {
    assertObjectId(id, "ID de pedido invalido");
    await connectDB();

    return runInTransaction(async (session) => {
        const currentPedido = await pedidosRepository.findById(id, session);

        if (!currentPedido) {
            throw new AppError("Pedido no encontrado", 404);
        }

        const nextPayload: Record<string, unknown> = { ...payload };

        if (payload.estadoPedido === "CANCELLED") {
            if (!payload.estadoEntrega) {
                nextPayload.estadoEntrega = "CANCELLED";
            }

            if (
                currentPedido.estadoReservaStock === "RESERVED" &&
                currentPedido.estadoPago !== "PAID"
            ) {
                await releasePedidoReservation(currentPedido, session);
                nextPayload.estadoReservaStock = "RELEASED";
                nextPayload.estadoPago = payload.estadoPago || "FAILED";
                nextPayload.reservadoEn = null;
                nextPayload.reservaExpiraEn = null;
            }

            await revertPromotionsForOrder(currentPedido._id, session);
        }

        Object.assign(currentPedido, nextPayload);
        await currentPedido.save({ session });
        await syncFulfillmentForOrder(currentPedido, session);

        await recordAuditEventSafe(
            {
                accion: "PEDIDO_STATUS_UPDATED",
                tipoEntidad: "PEDIDO",
                idEntidad: currentPedido._id.toString(),
                estado: "SUCCESS",
                metadata: {
                    estadoPedido: currentPedido.estadoPedido,
                    estadoPago: currentPedido.estadoPago,
                    estadoEntrega: currentPedido.estadoEntrega,
                },
            },
            session
        );

        return currentPedido;
    });
}

export async function cancelPedidoForCustomer(id: string, customerId: string) {
    assertObjectId(id, "ID de pedido invalido");
    await connectDB();

    return runInTransaction(async (session) => {
        const pedido = await pedidosRepository.findByIdForCustomer(id, customerId, session);

        if (!pedido) {
            throw new AppError("Pedido no encontrado o no pertenece al cliente", 404);
        }

        if (pedido.estadoPedido !== "PENDING_PAYMENT") {
            throw new AppError("Solo se pueden cancelar pedidos pendientes de pago", 400);
        }

        if (pedido.estadoReservaStock === "RESERVED") {
            await releasePedidoReservation(pedido, session);
        }

        await revertPromotionsForOrder(pedido._id, session);

        pedido.estadoPedido = "CANCELLED";
        pedido.estadoPago = "FAILED";
        pedido.estadoEntrega = "CANCELLED";
        pedido.estadoReservaStock = "RELEASED";
        pedido.reservadoEn = null;
        pedido.reservaExpiraEn = null;

        await pedido.save({ session });

        await recordAuditEventSafe({
            accion: "PEDIDO_CANCELLED_BY_CUSTOMER",
            tipoEntidad: "PEDIDO",
            idEntidad: pedido._id.toString(),
            idActor: customerId,
            rolActor: "CLIENTE",
            estado: "SUCCESS",
        }, session);

        return pedido;
    });
}

export async function updatePedidoEntregaForCustomer(
    id: string,
    customerId: string,
    deliveryData: UpdatePedidoEntregaInput
) {
    assertObjectId(id, "ID de pedido invalido");
    await connectDB();

    return runInTransaction(async (session) => {
        const pedido = await pedidosRepository.findByIdForCustomer(id, customerId, session);

        if (!pedido) {
            throw new AppError("Pedido no encontrado o no pertenece al cliente", 404);
        }

        if (pedido.estadoPedido !== "PENDING_PAYMENT") {
            throw new AppError("Solo se pueden editar pedidos pendientes de pago", 400);
        }

        const now = new Date();
        const createdAt = new Date(pedido.createdAt);
        const diffMs = now.getTime() - createdAt.getTime();
        const diffMins = diffMs / (1000 * 60);

        if (diffMins > 30) {
            throw new AppError("El plazo para editar el pedido (30 min) ha expirado", 403);
        }

        pedido.snapshotEntrega = {
            ...pedido.snapshotEntrega,
            ...deliveryData,
        };

        await pedido.save({ session });

        await recordAuditEventSafe({
            accion: "PEDIDO_DELIVERY_UPDATED_BY_CUSTOMER",
            tipoEntidad: "PEDIDO",
            idEntidad: pedido._id.toString(),
            idActor: customerId,
            rolActor: "CLIENTE",
            estado: "SUCCESS",
        }, session);

        return pedido;
    });
}

export async function confirmPedidoForDelivery(
    id: string,
    actor: { id: string; rol: AuditActorRole }
) {
    assertObjectId(id, "ID de pedido invalido");
    await connectDB();

    return runInTransaction(async (session) => {
        const pedido = await pedidosRepository.findById(id, session);

        if (!pedido) {
            throw new AppError("Pedido no encontrado", 404);
        }

        if (pedido.estadoPedido !== "PENDING_PAYMENT") {
            throw new AppError("El pedido ya no esta pendiente de pago", 400);
        }

        pedido.estadoPedido = "CONFIRMED";
        pedido.reservaExpiraEn = null;

        await pedido.save({ session });

        await recordAuditEventSafe(
            {
                accion: "PEDIDO_CONFIRMED_FOR_DELIVERY",
                tipoEntidad: "PEDIDO",
                idEntidad: pedido._id.toString(),
                idActor: actor.id,
                rolActor: actor.rol,
                estado: "SUCCESS",
            },
            session
        );

        return pedido;
    });
}
