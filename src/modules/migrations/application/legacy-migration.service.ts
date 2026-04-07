import type { ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Fulfillment from "@/models/fulfillment";
import Order from "@/models/order";
import PaymentTransaction from "@/models/paymentTransaction";
import Producto from "@/models/product";
import Venta from "@/models/venta";
import { syncFulfillmentForOrder } from "@/modules/fulfillment/application/fulfillment.service";
import { createOrderFromSale } from "@/modules/orders/application/orders.service";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { runInTransaction } from "@/shared/db/runTransaction";
import type {
  LegacyMigrationStep,
  RunLegacyMigrationInput,
} from "@/schemas/legacy-migration.schema";

type LegacyVentaRecord = {
  _id: { toString(): string };
  numeroVenta: string;
  items: Array<{
    productoId: { toString(): string };
    variante: {
      variantId?: string;
      color: string;
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
    cantidad: number;
    precioUnitario: number;
  }>;
  subtotal: number;
  descuento?: number;
  total: number;
  metodoPago: "EFECTIVO" | "QR";
  tipoVenta: "WEB" | "APP_QR" | "TIENDA";
  estado: "PAGADA" | "PENDIENTE" | "CANCELADA";
  cliente?: { toString(): string } | null;
  vendedor?: { toString(): string } | null;
  delivery?: {
    method: "WHATSAPP" | "PICKUP_LAPAZ" | "HOME_DELIVERY";
    pickupPoint?: "TELEFERICO_MORADO" | "TELEFERICO_ROJO" | "CORREOS" | null;
    address?: string | null;
    phone?: string | null;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type LegacyOrderRecord = {
  _id: { toString(): string };
  orderNumber: string;
  sourceSaleNumber?: string | null;
  customer?: { toString(): string } | null;
  metodoPago: "EFECTIVO" | "QR";
  total: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  createdAt?: Date;
  updatedAt?: Date;
};

type MigrationError = {
  step: LegacyMigrationStep;
  sourceId: string;
  message: string;
};

async function buildOrderItemsFromLegacySale(
  venta: LegacyVentaRecord,
  session?: ClientSession
) {
  const items = [];

  for (const item of venta.items) {
    const productoId = item.productoId?.toString();
    const producto = productoId
      ? await Producto.findById(productoId).session(session ?? null)
      : null;

    const matchedVariant = producto?.variantes?.find((candidate: {
      variantId?: string;
      color: string;
      talla: string;
      codigoBarra?: string;
      qrCode?: string;
      imagenes?: string[];
      imagen?: string;
    }) => {
      if (item.variante?.variantId && candidate.variantId) {
        return candidate.variantId === item.variante.variantId;
      }

      return (
        candidate.color === item.variante?.color &&
        candidate.talla === item.variante?.talla
      );
    });

    items.push({
      productoId,
      variante: {
        variantId: item.variante?.variantId || matchedVariant?.variantId,
        color: item.variante?.color || matchedVariant?.color || "Sin color",
        talla: item.variante?.talla || matchedVariant?.talla || "SIN_TALLA",
        codigoBarra: item.variante?.codigoBarra || matchedVariant?.codigoBarra,
        qrCode: item.variante?.qrCode || matchedVariant?.qrCode,
      },
      productoSnapshot: {
        nombre:
          item.productoSnapshot?.nombre ||
          producto?.nombre ||
          "Producto legacy",
        modelo:
          item.productoSnapshot?.modelo ||
          producto?.modelo ||
          "",
        sku:
          item.productoSnapshot?.sku ||
          producto?.sku ||
          "",
        imagen:
          item.productoSnapshot?.imagen ||
          matchedVariant?.imagenes?.[0] ||
          matchedVariant?.imagen ||
          undefined,
      },
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    });
  }

  return items;
}

function createMigrationPaymentNumber(orderId: string) {
  return `P-MIG-${Date.now()}-${orderId.slice(-6)}`;
}

function createMigrationIdempotencyKey(orderId: string) {
  return `migration-payment-${orderId}`;
}

function resolvePaymentFailureReason(status: LegacyOrderRecord["paymentStatus"]) {
  if (status === "FAILED") {
    return "Backfill de pago fallido desde orden existente";
  }

  if (status === "REFUNDED") {
    return "Backfill de pago reembolsado desde orden existente";
  }

  return null;
}

async function setHistoricalTimestamps(
  model:
    | typeof Order
    | typeof PaymentTransaction
    | typeof Fulfillment,
  id: string,
  createdAt?: Date,
  updatedAt?: Date,
  session?: ClientSession
) {
  if (!createdAt && !updatedAt) {
    return;
  }

  await model.updateOne(
    { _id: id },
    {
      $set: {
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
      },
    },
    {
      session,
      timestamps: false,
    }
  );
}

async function getLegacySalesWithoutOrder(limit: number) {
  return Venta.aggregate([
    {
      $lookup: {
        from: Order.collection.name,
        localField: "_id",
        foreignField: "sourceSaleId",
        as: "linkedOrders",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$linkedOrders" }, 0],
        },
      },
    },
    {
      $sort: {
        createdAt: 1,
        _id: 1,
      },
    },
    {
      $limit: limit,
    },
  ]) as Promise<LegacyVentaRecord[]>;
}

async function getSaleBackedOrdersWithoutPayments(limit: number) {
  return Order.aggregate([
    {
      $match: {
        sourceSaleId: { $ne: null },
      },
    },
    {
      $lookup: {
        from: PaymentTransaction.collection.name,
        localField: "_id",
        foreignField: "orderId",
        as: "payments",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$payments" }, 0],
        },
      },
    },
    {
      $sort: {
        createdAt: 1,
        _id: 1,
      },
    },
    {
      $limit: limit,
    },
  ]) as Promise<LegacyOrderRecord[]>;
}

async function getOrdersWithoutFulfillments(limit: number) {
  return Order.aggregate([
    {
      $lookup: {
        from: Fulfillment.collection.name,
        localField: "_id",
        foreignField: "orderId",
        as: "fulfillments",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$fulfillments" }, 0],
        },
      },
    },
    {
      $sort: {
        createdAt: 1,
        _id: 1,
      },
    },
    {
      $limit: limit,
    },
  ]) as Promise<Array<{ _id: { toString(): string } }>>;
}

async function countLegacySalesWithoutOrder() {
  const [result] = await Venta.aggregate([
    {
      $lookup: {
        from: Order.collection.name,
        localField: "_id",
        foreignField: "sourceSaleId",
        as: "linkedOrders",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$linkedOrders" }, 0],
        },
      },
    },
    {
      $count: "count",
    },
  ]);

  return result?.count ?? 0;
}

async function countSaleBackedOrdersWithoutPayments() {
  const [result] = await Order.aggregate([
    {
      $match: {
        sourceSaleId: { $ne: null },
      },
    },
    {
      $lookup: {
        from: PaymentTransaction.collection.name,
        localField: "_id",
        foreignField: "orderId",
        as: "payments",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$payments" }, 0],
        },
      },
    },
    {
      $count: "count",
    },
  ]);

  return result?.count ?? 0;
}

async function countOrdersWithoutFulfillments() {
  const [result] = await Order.aggregate([
    {
      $lookup: {
        from: Fulfillment.collection.name,
        localField: "_id",
        foreignField: "orderId",
        as: "fulfillments",
      },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $size: "$fulfillments" }, 0],
        },
      },
    },
    {
      $count: "count",
    },
  ]);

  return result?.count ?? 0;
}

async function getLegacyMigrationSamples(limit = 5) {
  const [sales, paymentOrders, fulfillmentOrders] = await Promise.all([
    getLegacySalesWithoutOrder(limit),
    getSaleBackedOrdersWithoutPayments(limit),
    getOrdersWithoutFulfillments(limit),
  ]);

  return {
    salesWithoutOrder: sales.map((sale) => sale._id.toString()),
    saleBackedOrdersWithoutPayment: paymentOrders.map((order) =>
      order._id.toString()
    ),
    ordersWithoutFulfillment: fulfillmentOrders.map((order) =>
      order._id.toString()
    ),
  };
}

async function backfillOrderFromSale(venta: LegacyVentaRecord) {
  return runInTransaction(async (session) => {
    const existingOrder = await Order.findOne({
      sourceSaleId: venta._id,
    }).session(session ?? null);

    if (existingOrder) {
      return {
        created: false,
        skipped: "ORDER_ALREADY_EXISTS",
      };
    }

    const items = await buildOrderItemsFromLegacySale(venta, session);

    const order = await createOrderFromSale(
      {
        saleId: venta._id.toString(),
        saleNumber: venta.numeroVenta,
        items,
        subtotal: venta.subtotal,
        descuento: venta.descuento || 0,
        total: venta.total,
        metodoPago: venta.metodoPago,
        channel: venta.tipoVenta,
        saleStatus: venta.estado,
        customerId: venta.cliente?.toString(),
        sellerId: venta.vendedor?.toString(),
        delivery: venta.delivery || undefined,
      },
      { session }
    );

    const createdAt = venta.createdAt || new Date();
    const updatedAt = venta.updatedAt || createdAt;

    await setHistoricalTimestamps(
      Order,
      order._id.toString(),
      createdAt,
      updatedAt,
      session
    );

    const fulfillment = await Fulfillment.findOne({
      orderId: order._id,
    }).session(session ?? null);

    if (fulfillment) {
      await setHistoricalTimestamps(
        Fulfillment,
        fulfillment._id.toString(),
        createdAt,
        updatedAt,
        session
      );
    }

    return {
      created: true,
      orderId: order._id.toString(),
    };
  });
}

async function backfillPaymentForOrder(orderRecord: LegacyOrderRecord) {
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderRecord._id).session(session ?? null);

    if (!order) {
      return {
        created: false,
        skipped: "ORDER_NOT_FOUND",
      };
    }

    const existingPayment = await PaymentTransaction.findOne({
      orderId: order._id,
    }).session(session ?? null);

    if (existingPayment) {
      return {
        created: false,
        skipped: "PAYMENT_ALREADY_EXISTS",
      };
    }

    const referenceDate = order.updatedAt || order.createdAt || new Date();
    const paymentPayload: Record<string, unknown> = {
      paymentNumber: createMigrationPaymentNumber(order._id.toString()),
      orderId: order._id,
      customer: order.customer || null,
      metodoPago: order.metodoPago,
      amount: order.total,
      status: order.paymentStatus,
      idempotencyKey: createMigrationIdempotencyKey(order._id.toString()),
      externalReference: order.sourceSaleNumber || order.orderNumber,
      failureReason: resolvePaymentFailureReason(order.paymentStatus),
      confirmedAt: order.paymentStatus === "PAID" ? referenceDate : null,
      failedAt: order.paymentStatus === "FAILED" ? referenceDate : null,
      refundedAt: order.paymentStatus === "REFUNDED" ? referenceDate : null,
      createdAt: order.createdAt || referenceDate,
      updatedAt: order.updatedAt || referenceDate,
    };

    const payment = await PaymentTransaction.create(
      [paymentPayload],
      { session }
    ).then(([createdPayment]) => createdPayment);

    return {
      created: true,
      paymentId: payment._id.toString(),
    };
  });
}

async function backfillFulfillmentForOrder(orderId: string) {
  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session ?? null);

    if (!order) {
      return {
        created: false,
        skipped: "ORDER_NOT_FOUND",
      };
    }

    const existingFulfillment = await Fulfillment.findOne({
      orderId: order._id,
    }).session(session ?? null);

    if (existingFulfillment) {
      return {
        created: false,
        skipped: "FULFILLMENT_ALREADY_EXISTS",
      };
    }

    const fulfillment = await syncFulfillmentForOrder(order, session);
    await setHistoricalTimestamps(
      Fulfillment,
      fulfillment._id.toString(),
      order.createdAt,
      order.updatedAt,
      session
    );

    return {
      created: true,
      fulfillmentId: fulfillment._id.toString(),
    };
  });
}

export async function getLegacyMigrationStatus() {
  await connectDB();

  const [
    totalSales,
    totalOrders,
    totalPayments,
    totalFulfillments,
    salesWithoutOrder,
    saleBackedOrdersWithoutPayment,
    ordersWithoutFulfillment,
    samples,
  ] = await Promise.all([
    Venta.countDocuments(),
    Order.countDocuments(),
    PaymentTransaction.countDocuments(),
    Fulfillment.countDocuments(),
    countLegacySalesWithoutOrder(),
    countSaleBackedOrdersWithoutPayments(),
    countOrdersWithoutFulfillments(),
    getLegacyMigrationSamples(),
  ]);

  return {
    totals: {
      sales: totalSales,
      orders: totalOrders,
      payments: totalPayments,
      fulfillments: totalFulfillments,
    },
    pendingBackfill: {
      salesWithoutOrder,
      saleBackedOrdersWithoutPayment,
      ordersWithoutFulfillment,
    },
    samples,
    compatibility: {
      legacyFallbackStillRequired: salesWithoutOrder > 0,
      readyToDisableLegacyFallback:
        salesWithoutOrder === 0 &&
        saleBackedOrdersWithoutPayment === 0 &&
        ordersWithoutFulfillment === 0,
    },
  };
}

export async function runLegacyMigration(input: RunLegacyMigrationInput) {
  await connectDB();

  const steps = [...new Set(input.steps)];
  const before = await getLegacyMigrationStatus();

  if (input.dryRun) {
    return {
      dryRun: true,
      limit: input.limit,
      steps,
      before,
      processed: {
        ordersCreated: 0,
        paymentsCreated: 0,
        fulfillmentsCreated: 0,
      },
      skipped: {
        orders: 0,
        payments: 0,
        fulfillments: 0,
      },
      errors: [],
    };
  }

  const result = {
    dryRun: false,
    limit: input.limit,
    steps,
    before,
    processed: {
      ordersCreated: 0,
      paymentsCreated: 0,
      fulfillmentsCreated: 0,
    },
    skipped: {
      orders: 0,
      payments: 0,
      fulfillments: 0,
    },
    errors: [] as MigrationError[],
  };

  if (steps.includes("ORDERS")) {
    const sales = await getLegacySalesWithoutOrder(input.limit);

    for (const sale of sales) {
      try {
        const stepResult = await backfillOrderFromSale(sale);

        if (stepResult.created) {
          result.processed.ordersCreated += 1;
        } else {
          result.skipped.orders += 1;
        }
      } catch (error) {
        result.errors.push({
          step: "ORDERS",
          sourceId: sale._id.toString(),
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }
  }

  if (steps.includes("PAYMENTS")) {
    const orders = await getSaleBackedOrdersWithoutPayments(input.limit);

    for (const order of orders) {
      try {
        const stepResult = await backfillPaymentForOrder(order);

        if (stepResult.created) {
          result.processed.paymentsCreated += 1;
        } else {
          result.skipped.payments += 1;
        }
      } catch (error) {
        result.errors.push({
          step: "PAYMENTS",
          sourceId: order._id.toString(),
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }
  }

  if (steps.includes("FULFILLMENTS")) {
    const orders = await getOrdersWithoutFulfillments(input.limit);

    for (const order of orders) {
      try {
        const stepResult = await backfillFulfillmentForOrder(order._id.toString());

        if (stepResult.created) {
          result.processed.fulfillmentsCreated += 1;
        } else {
          result.skipped.fulfillments += 1;
        }
      } catch (error) {
        result.errors.push({
          step: "FULFILLMENTS",
          sourceId: order._id.toString(),
          message: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }
  }

  const finalResult = {
    ...result,
    after: await getLegacyMigrationStatus(),
  };

  await recordAuditEventSafe({
    action: "LEGACY_MIGRATION_RUN",
    entityType: "MIGRATION",
    entityId: `legacy-${Date.now()}`,
    actorRole: "SYSTEM",
    status: "SUCCESS",
    metadata: {
      dryRun: false,
      limit: input.limit,
      steps,
      processed: finalResult.processed,
      skipped: finalResult.skipped,
      errors: finalResult.errors.length,
    },
  });

  return finalResult;
}
