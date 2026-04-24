import CustomerAddress from "@/models/direccionCliente";
import CustomerProfile from "@/models/perfilCliente";
import Fulfillment from "@/models/entrega";
import Inventario from "@/models/inventario";
import Pedido from "@/models/pedido";
import PaymentTransaction from "@/models/transaccionPago";
import Producto from "@/models/producto";
import User from "@/models/user";
import { crearDireccionClientePorUsuario } from "@/modules/clientes/application/clientes.service";
import { addCartItemByUserId, clearCartByUserId } from "@/modules/cart/application/cart.service";
import { updateFulfillmentStatusById } from "@/modules/fulfillment/application/fulfillment.service";
import { createPaymentTransaction, confirmPaymentTransaction, failPaymentTransaction, refundPaymentTransaction } from "@/modules/payments/application/payments.service";
import { createPosSale, scanVariantForPos } from "@/modules/pos/application/pos.service";
import { crearPedidoDesdeCarrito } from "@/modules/orders/application/pedidos.service";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { connectDB } from "@/libs/mongodb";
import type { RunCoreVerificationInput } from "@/schemas/core-verification.schema";
import { logError, logInfo } from "@/shared/observability/logger";

type Actor = {
  id: string;
  rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

type VerificationContext = {
  stamp: string;
  customerId?: string;
  sellerId?: string;
  profileId?: string;
  direccionId?: string;
  productId?: string;
  createdPedidoIds: string[];
  createdPaymentIds: string[];
  createdFulfillmentIds: string[];
};

function createStamp() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function waitUniqueTick() {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

function buildVariantCode(prefix: string, stamp: string, suffix: string) {
  return `${prefix}-${stamp}-${suffix}`;
}

function requireId(value: string | undefined, message: string) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

async function createTempUsers(stamp: string) {
  const [customer, seller] = await User.create([
    {
      email: `e2e.customer.${stamp}@fitandes.local`,
      password: "e2e-password",
      nombreCompleto: `E2E Customer ${stamp}`,
      rol: "CLIENTE",
      estaActivo: true,
    },
    {
      email: `e2e.seller.${stamp}@fitandes.local`,
      password: "e2e-password",
      nombreCompleto: `E2E Seller ${stamp}`,
      rol: "VENDEDOR",
      estaActivo: true,
    },
  ]);

  return { customer, seller };
}

async function createTempProduct(sellerId: string, stamp: string) {
  const product = await Producto.create({
    nombre: `E2E Product ${stamp}`,
    modelo: `Core ${stamp}`,
    categoria: "E2E",
    descripcion: "Producto temporal para verificacion E2E del core",
    sku: `E2E-${stamp}`.slice(0, 50),
    precioVenta: 120,
    precioCosto: 70,
    variantes: [
      {
        varianteId: buildVariantCode("variant", stamp, "web"),
        color: "Negro",
        talla: "M",
        stock: 12,
        reservedStock: 0,
        descripcion: "Variante web",
        imagenes: [],
        codigoBarra: buildVariantCode("barcode", stamp, "web"),
        qrCode: buildVariantCode("qr", stamp, "web"),
      },
      {
        varianteId: buildVariantCode("variant", stamp, "pos"),
        color: "Blanco",
        talla: "L",
        stock: 8,
        reservedStock: 0,
        descripcion: "Variante POS",
        imagenes: [],
        codigoBarra: buildVariantCode("barcode", stamp, "pos"),
        qrCode: buildVariantCode("qr", stamp, "pos"),
      },
    ],
    creadoPor: sellerId,
  });

  return product;
}

async function trackFulfillment(pedidoId: string, context: VerificationContext) {
  const fulfillment = await Fulfillment.findOne({ pedidoId: pedidoId });
  if (fulfillment) {
    context.createdFulfillmentIds.push(fulfillment._id.toString());
  }
  return fulfillment;
}

async function cleanupVerificationData(context: VerificationContext) {
  await Promise.all([
    context.createdPaymentIds.length > 0
      ? PaymentTransaction.deleteMany({ _id: { $in: context.createdPaymentIds } })
      : Promise.resolve(),
    context.createdFulfillmentIds.length > 0
      ? Fulfillment.deleteMany({ _id: { $in: context.createdFulfillmentIds } })
      : Promise.resolve(),
    context.createdPedidoIds.length > 0
      ? Pedido.deleteMany({ _id: { $in: context.createdPedidoIds } })
      : Promise.resolve(),
    context.productId
      ? Inventario.deleteMany({ productoId: context.productId })
      : Promise.resolve(),
    context.customerId
      ? CustomerAddress.deleteMany({ customerProfileId: context.profileId || null })
      : Promise.resolve(),
    context.profileId
      ? CustomerProfile.deleteMany({ _id: context.profileId })
      : Promise.resolve(),
    context.customerId
      ? User.deleteMany({ _id: { $in: [context.customerId, context.sellerId].filter(Boolean) } })
      : Promise.resolve(),
    context.productId ? Producto.deleteOne({ _id: context.productId }) : Promise.resolve(),
  ]);
}

export async function runCoreEndToEndVerification(
  actor: Actor,
  input: RunCoreVerificationInput,
  requestId?: string
) {
  await connectDB();

  const context: VerificationContext = {
    stamp: createStamp(),
    createdPedidoIds: [],
    createdPaymentIds: [],
    createdFulfillmentIds: [],
  };

  const steps: Array<Record<string, unknown>> = [];

  logInfo({
    message: "Inicio de verificacion E2E del core",
    context: "ops.core-verification",
    requestId,
    data: {
      idActor: actor.id,
      cleanup: input.cleanup,
    },
  });

  try {
    const { customer, seller } = await createTempUsers(context.stamp);
    context.customerId = customer._id.toString();
    context.sellerId = seller._id.toString();
    const customerId = requireId(context.customerId, "No se pudo crear el cliente temporal");
    const sellerId = requireId(context.sellerId, "No se pudo crear el vendedor temporal");

    const address = await crearDireccionClientePorUsuario(customerId, {
      etiqueta: "Casa",
      nombreDestinatario: customer.nombreCompleto,
      telefono: "76543210",
      departamento: "La Paz",
      ciudad: "La Paz",
      zona: "Zona Sur",
      direccion: `E2E Street ${context.stamp}`,
      referencia: "Porton negro",
      codigoPostal: null,
      pais: "Bolivia",
      esPredeterminada: true,
    });
    context.direccionId = address._id.toString();
    context.profileId = address.customerProfileId.toString();
    const direccionId = requireId(context.direccionId, "No se pudo crear la direccion temporal");

    const product = await createTempProduct(sellerId, context.stamp);
    context.productId = product._id.toString();
    const productId = requireId(context.productId, "No se pudo crear el producto temporal");

    const customerActor: Actor = {
      id: customerId,
      rol: "CLIENTE",
    };
    const sellerActor: Actor = {
      id: sellerId,
      rol: "VENDEDOR",
    };

    const webVariant = product.variantes[0];
    const posVariant = product.variantes[1];

    await addCartItemByUserId(customerId, {
      productoId: productId,
      varianteId: webVariant.varianteId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const checkoutOrder = await crearPedidoDesdeCarrito(customerId, {
      metodoPago: "QR",
      direccionId,
    });
    context.createdPedidoIds.push(checkoutOrder._id.toString());
    await trackFulfillment(checkoutOrder._id.toString(), context);

    await waitUniqueTick();
    const payment = await createPaymentTransaction(customerActor, {
      pedidoId: checkoutOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-checkout-${context.stamp}`,
      referenciaExterna: `e2e-qr-${context.stamp}`,
    });
    context.createdPaymentIds.push(payment._id.toString());

    await waitUniqueTick();
    await confirmPaymentTransaction(
      customerActor,
      payment._id.toString(),
      {
        referenciaExterna: `e2e-confirmed-${context.stamp}`,
      }
    );

    const confirmedFulfillment = await trackFulfillment(
      checkoutOrder._id.toString(),
      context
    );

    if (confirmedFulfillment) {
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        estado: "READY",
        codigoSeguimiento: null,
        nombreTransportista: null,
        asignadoA: null,
        notas: "E2E ready",
      });
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        estado: "IN_TRANSIT",
        codigoSeguimiento: `TRK-${context.stamp}`,
        nombreTransportista: "E2E Courier",
        asignadoA: null,
        notas: null,
      });
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        estado: "DELIVERED",
        codigoSeguimiento: `TRK-${context.stamp}`,
        nombreTransportista: "E2E Courier",
        asignadoA: null,
        notas: "E2E delivered",
      });
    }

    steps.push({
      name: "checkout-confirm-fulfillment",
      success: true,
      details: {
        pedidoId: checkoutOrder._id.toString(),
        paymentId: payment._id.toString(),
        fulfillmentId: confirmedFulfillment?._id?.toString() || null,
      },
    });

    await clearCartByUserId(customerId);
    await addCartItemByUserId(customerId, {
      productoId: productId,
      varianteId: webVariant.varianteId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const failedOrder = await crearPedidoDesdeCarrito(customerId, {
      metodoPago: "QR",
      direccionId,
    });
    context.createdPedidoIds.push(failedOrder._id.toString());
    await trackFulfillment(failedOrder._id.toString(), context);

    await waitUniqueTick();
    const failedPayment = await createPaymentTransaction(customerActor, {
      pedidoId: failedOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-failed-${context.stamp}`,
    });
    context.createdPaymentIds.push(failedPayment._id.toString());
    await failPaymentTransaction(customerActor, failedPayment._id.toString(), {
      motivo: "E2E failure path",
    });

    steps.push({
      name: "payment-failure",
      success: true,
      details: {
        pedidoId: failedOrder._id.toString(),
        paymentId: failedPayment._id.toString(),
      },
    });

    await clearCartByUserId(customerId);
    await addCartItemByUserId(customerId, {
      productoId: productId,
      varianteId: webVariant.varianteId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const refundOrder = await crearPedidoDesdeCarrito(customerId, {
      metodoPago: "QR",
      direccionId,
    });
    context.createdPedidoIds.push(refundOrder._id.toString());
    await trackFulfillment(refundOrder._id.toString(), context);

    await waitUniqueTick();
    const refundPayment = await createPaymentTransaction(customerActor, {
      pedidoId: refundOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-refund-${context.stamp}`,
    });
    context.createdPaymentIds.push(refundPayment._id.toString());
    await confirmPaymentTransaction(
      customerActor,
      refundPayment._id.toString(),
      {}
    );
    await refundPaymentTransaction(sellerActor, refundPayment._id.toString(), {
      motivo: "E2E refund path",
    });

    steps.push({
      name: "refund",
      success: true,
      details: {
        pedidoId: refundOrder._id.toString(),
        paymentId: refundPayment._id.toString(),
      },
    });

    const posScanCode =
      posVariant.codigoBarra || posVariant.qrCode || null;

    if (!posScanCode) {
      throw new Error("La variante POS temporal no tiene codigo de escaneo");
    }

    const scanned = await scanVariantForPos(posScanCode);
    await waitUniqueTick();
    const posSale = await createPosSale(sellerActor, {
      items: [
        {
          productoId: productId,
          varianteId: posVariant.varianteId,
          color: posVariant.color,
          talla: posVariant.talla,
          cantidad: 1,
        },
      ],
      metodoPago: "EFECTIVO",
      descuento: 0,
    });
    context.createdPedidoIds.push((posSale as unknown as { _id: string })._id.toString());
    await trackFulfillment((posSale as unknown as { _id: string })._id.toString(), context);

    steps.push({
      name: "pos-sale",
      success: true,
      details: {
        scanSource: scanned.scanSource,
        pedidoId: (posSale as unknown as { _id: string })._id.toString(),
      },
    });

    await recordAuditEventSafe({
      requestId,
      accion: "CORE_VERIFICATION_RUN",
      tipoEntidad: "SYSTEM",
      idEntidad: context.stamp,
      idActor: actor.id,
      rolActor: actor.rol,
      estado: "SUCCESS",
      metadata: {
        steps: steps.map((step) => step.name),
        cleanup: input.cleanup,
      },
    });

    const result = {
      success: true,
      requestId: requestId || null,
      stamp: context.stamp,
      cleanup: input.cleanup,
      steps,
      artifacts: {
        customerId: context.customerId,
        sellerId: context.sellerId,
        productId: context.productId,
        orderIds: context.createdPedidoIds,
        paymentIds: context.createdPaymentIds,
        fulfillmentIds: context.createdFulfillmentIds,
      },
    };

    if (input.cleanup) {
      await cleanupVerificationData(context);
      return {
        ...result,
        cleanupPerformed: true,
      };
    }

    return {
      ...result,
      cleanupPerformed: false,
    };
  } catch (error) {
    logError({
      message: "Fallo la verificacion E2E del core",
      context: "ops.core-verification",
      requestId,
      data: {
        stamp: context.stamp,
      },
      error,
    });

    await recordAuditEventSafe({
      requestId,
      accion: "CORE_VERIFICATION_RUN",
      tipoEntidad: "SYSTEM",
      idEntidad: context.stamp,
      idActor: actor.id,
      rolActor: actor.rol,
      estado: "FAILED",
      mensajeError: error instanceof Error ? error.message : "Error desconocido",
      metadata: {
        cleanup: input.cleanup,
      },
    });

    if (input.cleanup) {
      await cleanupVerificationData(context);
    }

    throw error;
  }
}
