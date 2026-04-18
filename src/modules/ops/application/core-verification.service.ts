import CustomerAddress from "@/models/customerAddress";
import CustomerProfile from "@/models/customerProfile";
import Fulfillment from "@/models/fulfillment";
import Inventario from "@/models/inventario";
import Order from "@/models/order";
import PaymentTransaction from "@/models/paymentTransaction";
import Producto from "@/models/product";
import User from "@/models/user";
import Venta from "@/models/venta";
import { createCustomerAddressByUserId } from "@/modules/customers/application/customers.service";
import { addCartItemByUserId, clearCartByUserId } from "@/modules/cart/application/cart.service";
import { updateFulfillmentStatusById } from "@/modules/fulfillment/application/fulfillment.service";
import { runLegacyMigration, getLegacyMigrationStatus } from "@/modules/migrations/application/legacy-migration.service";
import { createPaymentTransaction, confirmPaymentTransaction, failPaymentTransaction, refundPaymentTransaction } from "@/modules/payments/application/payments.service";
import { createPosSale, scanVariantForPos } from "@/modules/pos/application/pos.service";
import { checkoutCartToOrder } from "@/modules/orders/application/orders.service";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { connectDB } from "@/libs/mongodb";
import type { RunCoreVerificationInput } from "@/schemas/core-verification.schema";
import { logError, logInfo } from "@/shared/observability/logger";

type Actor = {
  id: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
};

type VerificationContext = {
  stamp: string;
  customerId?: string;
  sellerId?: string;
  profileId?: string;
  addressId?: string;
  productId?: string;
  createdOrderIds: string[];
  createdPaymentIds: string[];
  createdFulfillmentIds: string[];
  createdSaleIds: string[];
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
      fullname: `E2E Customer ${stamp}`,
      role: "CLIENTE",
      isActive: true,
    },
    {
      email: `e2e.seller.${stamp}@fitandes.local`,
      password: "e2e-password",
      fullname: `E2E Seller ${stamp}`,
      role: "VENDEDOR",
      isActive: true,
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
        variantId: buildVariantCode("variant", stamp, "web"),
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
        variantId: buildVariantCode("variant", stamp, "pos"),
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

async function trackFulfillment(orderId: string, context: VerificationContext) {
  const fulfillment = await Fulfillment.findOne({ orderId });
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
    context.createdOrderIds.length > 0
      ? Order.deleteMany({ _id: { $in: context.createdOrderIds } })
      : Promise.resolve(),
    context.createdSaleIds.length > 0
      ? Venta.deleteMany({ _id: { $in: context.createdSaleIds } })
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
    createdOrderIds: [],
    createdPaymentIds: [],
    createdFulfillmentIds: [],
    createdSaleIds: [],
  };

  const steps: Array<Record<string, unknown>> = [];

  logInfo({
    message: "Inicio de verificacion E2E del core",
    context: "ops.core-verification",
    requestId,
    data: {
      actorId: actor.id,
      cleanup: input.cleanup,
      runLegacyMigration: input.runLegacyMigration,
    },
  });

  try {
    const legacyBefore = await getLegacyMigrationStatus();
    let legacyRunResult: Record<string, unknown> | null = null;

    if (input.runLegacyMigration) {
      legacyRunResult = await runLegacyMigration({
        limit: input.legacyMigrationLimit,
        dryRun: false,
        steps: ["ORDERS", "PAYMENTS", "FULFILLMENTS"],
      });
      steps.push({
        name: "legacy-migration",
        success: true,
        details: legacyRunResult,
      });
    }

    const { customer, seller } = await createTempUsers(context.stamp);
    context.customerId = customer._id.toString();
    context.sellerId = seller._id.toString();
    const customerId = requireId(context.customerId, "No se pudo crear el cliente temporal");
    const sellerId = requireId(context.sellerId, "No se pudo crear el vendedor temporal");

    const address = await createCustomerAddressByUserId(customerId, {
      label: "Casa",
      recipientName: customer.fullname,
      phone: "76543210",
      department: "La Paz",
      city: "La Paz",
      zone: "Zona Sur",
      addressLine: `E2E Street ${context.stamp}`,
      reference: "Porton negro",
      postalCode: null,
      country: "Bolivia",
      isDefault: true,
    });
    context.addressId = address._id.toString();
    context.profileId = address.customerProfileId.toString();
    const addressId = requireId(context.addressId, "No se pudo crear la direccion temporal");

    const product = await createTempProduct(sellerId, context.stamp);
    context.productId = product._id.toString();
    const productId = requireId(context.productId, "No se pudo crear el producto temporal");

    const customerActor: Actor = {
      id: customerId,
      role: "CLIENTE",
    };
    const sellerActor: Actor = {
      id: sellerId,
      role: "VENDEDOR",
    };

    const webVariant = product.variantes[0];
    const posVariant = product.variantes[1];

    await addCartItemByUserId(customerId, {
      productoId: productId,
      variantId: webVariant.variantId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const checkoutOrder = await checkoutCartToOrder(customerId, {
      metodoPago: "QR",
      addressId,
    });
    context.createdOrderIds.push(checkoutOrder._id.toString());
    await trackFulfillment(checkoutOrder._id.toString(), context);

    await waitUniqueTick();
    const payment = await createPaymentTransaction(customerActor, {
      orderId: checkoutOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-checkout-${context.stamp}`,
      externalReference: `e2e-qr-${context.stamp}`,
    });
    context.createdPaymentIds.push(payment._id.toString());

    await waitUniqueTick();
    const confirmed = await confirmPaymentTransaction(
      customerActor,
      payment._id.toString(),
      {
        externalReference: `e2e-confirmed-${context.stamp}`,
      }
    );
    if (confirmed.venta?._id) {
      context.createdSaleIds.push(confirmed.venta._id.toString());
    }

    const confirmedFulfillment = await trackFulfillment(
      checkoutOrder._id.toString(),
      context
    );

    if (confirmedFulfillment) {
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        status: "READY",
        trackingCode: null,
        courierName: null,
        assignedTo: null,
        notes: "E2E ready",
      });
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        status: "IN_TRANSIT",
        trackingCode: `TRK-${context.stamp}`,
        courierName: "E2E Courier",
        assignedTo: null,
        notes: null,
      });
      await updateFulfillmentStatusById(confirmedFulfillment._id.toString(), {
        status: "DELIVERED",
        trackingCode: `TRK-${context.stamp}`,
        courierName: "E2E Courier",
        assignedTo: null,
        notes: "E2E delivered",
      });
    }

    steps.push({
      name: "checkout-confirm-fulfillment",
      success: true,
      details: {
        orderId: checkoutOrder._id.toString(),
        paymentId: payment._id.toString(),
        saleId: confirmed.venta?._id?.toString() || null,
        fulfillmentId: confirmedFulfillment?._id?.toString() || null,
      },
    });

    await clearCartByUserId(customerId);
    await addCartItemByUserId(customerId, {
      productoId: productId,
      variantId: webVariant.variantId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const failedOrder = await checkoutCartToOrder(customerId, {
      metodoPago: "QR",
      addressId,
    });
    context.createdOrderIds.push(failedOrder._id.toString());
    await trackFulfillment(failedOrder._id.toString(), context);

    await waitUniqueTick();
    const failedPayment = await createPaymentTransaction(customerActor, {
      orderId: failedOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-failed-${context.stamp}`,
    });
    context.createdPaymentIds.push(failedPayment._id.toString());
    await failPaymentTransaction(customerActor, failedPayment._id.toString(), {
      reason: "E2E failure path",
    });

    steps.push({
      name: "payment-failure",
      success: true,
      details: {
        orderId: failedOrder._id.toString(),
        paymentId: failedPayment._id.toString(),
      },
    });

    await clearCartByUserId(customerId);
    await addCartItemByUserId(customerId, {
      productoId: productId,
      variantId: webVariant.variantId,
      color: webVariant.color,
      talla: webVariant.talla,
      cantidad: 1,
    });
    await waitUniqueTick();

    const refundOrder = await checkoutCartToOrder(customerId, {
      metodoPago: "QR",
      addressId,
    });
    context.createdOrderIds.push(refundOrder._id.toString());
    await trackFulfillment(refundOrder._id.toString(), context);

    await waitUniqueTick();
    const refundPayment = await createPaymentTransaction(customerActor, {
      orderId: refundOrder._id.toString(),
      metodoPago: "QR",
      idempotencyKey: `e2e-refund-${context.stamp}`,
    });
    context.createdPaymentIds.push(refundPayment._id.toString());
    const refundConfirmed = await confirmPaymentTransaction(
      customerActor,
      refundPayment._id.toString(),
      {}
    );
    if (refundConfirmed.venta?._id) {
      context.createdSaleIds.push(refundConfirmed.venta._id.toString());
    }
    await refundPaymentTransaction(sellerActor, refundPayment._id.toString(), {
      reason: "E2E refund path",
    });

    steps.push({
      name: "refund",
      success: true,
      details: {
        orderId: refundOrder._id.toString(),
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
          variantId: posVariant.variantId,
          color: posVariant.color,
          talla: posVariant.talla,
          cantidad: 1,
        },
      ],
      metodoPago: "EFECTIVO",
      descuento: 0,
    });
    context.createdSaleIds.push(posSale.venta._id.toString());
    context.createdOrderIds.push(posSale.order._id.toString());
    await trackFulfillment(posSale.order._id.toString(), context);

    steps.push({
      name: "pos-sale",
      success: true,
      details: {
        scanSource: scanned.scanSource,
        saleId: posSale.venta._id.toString(),
        orderId: posSale.order._id.toString(),
      },
    });

    const legacyAfter = await getLegacyMigrationStatus();

    await recordAuditEventSafe({
      requestId,
      action: "CORE_VERIFICATION_RUN",
      entityType: "SYSTEM",
      entityId: context.stamp,
      actorId: actor.id,
      actorRole: actor.role,
      status: "SUCCESS",
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
      legacyBefore,
      legacyRunResult,
      legacyAfter,
      legacyFallbackStillRequired: legacyAfter.compatibility.legacyFallbackStillRequired,
      steps,
      artifacts: {
        customerId: context.customerId,
        sellerId: context.sellerId,
        productId: context.productId,
        orderIds: context.createdOrderIds,
        paymentIds: context.createdPaymentIds,
        fulfillmentIds: context.createdFulfillmentIds,
        saleIds: context.createdSaleIds,
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
      action: "CORE_VERIFICATION_RUN",
      entityType: "SYSTEM",
      entityId: context.stamp,
      actorId: actor.id,
      actorRole: actor.role,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Error desconocido",
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
