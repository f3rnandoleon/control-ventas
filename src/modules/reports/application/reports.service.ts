import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import PaymentTransaction from "@/models/transaccionPago";
import Inventario from "@/models/inventario";
import { AppError } from "@/shared/errors/AppError";

type ReportFilters = {
  dateMatch: Record<string, unknown>;
  limit: number;
};

function parseReportFilters(request: Request): ReportFilters {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limitRaw = searchParams.get("limit");
  const dateMatch: Record<string, unknown> = {};

  if (from) {
    const fromDate = new Date(from);

    if (Number.isNaN(fromDate.getTime())) {
      throw new AppError("Parametro from invalido", 400);
    }

    dateMatch.$gte = fromDate;
  }

  if (to) {
    const toDate = new Date(to);

    if (Number.isNaN(toDate.getTime())) {
      throw new AppError("Parametro to invalido", 400);
    }

    toDate.setHours(23, 59, 59, 999);
    dateMatch.$lte = toDate;
  }

  let limit = 10;

  if (limitRaw) {
    const parsedLimit = Number(limitRaw);

    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      throw new AppError("Parametro limit invalido", 400);
    }

    limit = parsedLimit;
  }

  return {
    dateMatch,
    limit,
  };
}

function buildMatch(dateMatch: Record<string, unknown>) {
  return Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};
}

export async function getGeneralReport(request: Request) {
  await connectDB();

  const { dateMatch } = parseReportFilters(request);
  const pedidoMatch = buildMatch(dateMatch);
  const paymentDateField = Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};

  // Solo consideramos pedidos que NO esten cancelados y que representen una venta real para summary de ventas
  const salesMatch = {
    ...pedidoMatch,
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  const [salesSummary, channelBreakdown, paymentBreakdown, orderBreakdown] =
    await Promise.all([
      Pedido.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: null,
            totalVentas: { $sum: "$total" },
            gananciaTotal: { $sum: "$gananciaTotal" },
            cantidadVentas: { $sum: 1 },
            totalDescuentos: { $sum: "$descuento" },
          },
        },
      ]),
      Pedido.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: "$canal",
            totalVentas: { $sum: "$total" },
            cantidad: { $sum: 1 },
          },
        },
        { $sort: { totalVentas: -1 } },
      ]),
      PaymentTransaction.aggregate([
        { $match: paymentDateField },
        {
          $group: {
            _id: "$estado",
            cantidad: { $sum: 1 },
            monto: { $sum: "$monto" },
          },
        },
        { $sort: { cantidad: -1 } },
      ]),
      Pedido.aggregate([
        { $match: pedidoMatch },
        {
          $group: {
            _id: null,
            pedidosCancelados: {
              $sum: {
                $cond: [{ $eq: ["$estadoPedido", "CANCELLED"] }, 1, 0],
              },
            },
            pedidosEntregados: {
              $sum: {
                $cond: [{ $eq: ["$estadoPedido", "DELIVERED"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

  return {
    totalVentas: salesSummary[0]?.totalVentas || 0,
    gananciaTotal: salesSummary[0]?.gananciaTotal || 0,
    cantidadVentas: salesSummary[0]?.cantidadVentas || 0,
    totalDescuentos: salesSummary[0]?.totalDescuentos || 0,
    pedidosCancelados: orderBreakdown[0]?.pedidosCancelados || 0,
    pedidosEntregados: orderBreakdown[0]?.pedidosEntregados || 0,
    ventasPorCanal: channelBreakdown,
    transaccionesPorEstado: paymentBreakdown,
  };
}

export async function getDailySalesReport(request: Request) {
  await connectDB();
  const { dateMatch } = parseReportFilters(request);

  const salesMatch = {
    ...buildMatch(dateMatch),
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  return Pedido.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        totalVentas: { $sum: "$total" },
        ganancia: { $sum: "$gananciaTotal" },
        cantidad: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

export async function getMonthlySalesReport(request: Request) {
  await connectDB();
  const { dateMatch } = parseReportFilters(request);

  const salesMatch = {
    ...buildMatch(dateMatch),
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  return Pedido.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: {
          anio: { $year: "$createdAt" },
          mes: { $month: "$createdAt" },
        },
        totalVentas: { $sum: "$total" },
        ganancia: { $sum: "$gananciaTotal" },
        cantidad: { $sum: 1 },
      },
    },
    { $sort: { "_id.anio": 1, "_id.mes": 1 } },
  ]);
}

export async function getTopProductsReport(request: Request) {
  await connectDB();
  const { dateMatch, limit } = parseReportFilters(request);

  const salesMatch = {
    ...buildMatch(dateMatch),
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  return Pedido.aggregate([
    { $match: salesMatch },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productoId",
        nombre: { $first: "$items.productoSnapshot.nombre" },
        modelo: { $first: "$items.productoSnapshot.modelo" },
        sku: { $first: "$items.productoSnapshot.sku" },
        cantidadVendida: { $sum: "$items.cantidad" },
        totalVendido: {
          $sum: {
            $multiply: ["$items.cantidad", "$items.precioUnitario"],
          },
        },
        ganancia: { $sum: "$items.ganancia" },
      },
    },
    { $sort: { cantidadVendida: -1 } },
    { $limit: limit },
  ]);
}

export async function getTopVariantsReport(request: Request) {
  await connectDB();
  const { dateMatch, limit } = parseReportFilters(request);

  const salesMatch = {
    ...buildMatch(dateMatch),
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  return Pedido.aggregate([
    { $match: salesMatch },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          varianteId: "$items.variante.varianteId",
          color: "$items.variante.color",
          talla: "$items.variante.talla",
          productoId: "$items.productoId",
        },
        nombre: { $first: "$items.productoSnapshot.nombre" },
        modelo: { $first: "$items.productoSnapshot.modelo" },
        sku: { $first: "$items.productoSnapshot.sku" },
        cantidadVendida: { $sum: "$items.cantidad" },
        totalVendido: {
          $sum: {
            $multiply: ["$items.cantidad", "$items.precioUnitario"],
          },
        },
        ganancia: { $sum: "$items.ganancia" },
      },
    },
    { $sort: { cantidadVendida: -1 } },
    { $limit: limit },
  ]);
}

export async function getSalesByChannelReport(request: Request) {
  await connectDB();
  const { dateMatch } = parseReportFilters(request);

  const salesMatch = {
    ...buildMatch(dateMatch),
    estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] }
  };

  return Pedido.aggregate([
    { $match: salesMatch },
    {
      $group: {
        _id: "$canal",
        totalVentas: { $sum: "$total" },
        gananciaTotal: { $sum: "$gananciaTotal" },
        cantidadVentas: { $sum: 1 },
      },
    },
    { $sort: { totalVentas: -1 } },
  ]);
}

export async function getSalesBySellerReport(request: Request) {
  await connectDB();
  const { dateMatch } = parseReportFilters(request);

  return Pedido.aggregate([
    {
      $match: {
        ...buildMatch(dateMatch),
        estadoPedido: { $nin: ["CANCELLED", "PENDING_PAYMENT"] },
        vendedor: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$vendedor",
        totalVentas: { $sum: "$total" },
        gananciaTotal: { $sum: "$gananciaTotal" },
        cantidadVentas: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "vendedor",
      },
    },
    {
      $project: {
        _id: 1,
        totalVentas: 1,
        gananciaTotal: 1,
        cantidadVentas: 1,
        vendedor: {
          $let: {
            vars: { seller: { $arrayElemAt: ["$vendedor", 0] } },
            in: {
              _id: "$$seller._id",
              nombreCompleto: "$$seller.nombreCompleto",
              email: "$$seller.email",
            },
          },
        },
      },
    },
    { $sort: { totalVentas: -1 } },
  ]);
}

export async function getCancellationsReport(request: Request) {
  await connectDB();
  const { dateMatch } = parseReportFilters(request);
  const pedidoMatch = buildMatch(dateMatch);

  const [pedidos, payments, cancellationByChannel] = await Promise.all([
    Pedido.aggregate([
      { $match: pedidoMatch },
      {
        $group: {
          _id: null,
          pedidosCancelados: {
            $sum: {
              $cond: [{ $eq: ["$estadoPedido", "CANCELLED"] }, 1, 0],
            },
          },
          pedidosRefunded: {
            $sum: {
              $cond: [{ $eq: ["$estadoPago", "REFUNDED"] }, 1, 0],
            },
          },
          pedidosFailed: {
            $sum: {
              $cond: [{ $eq: ["$estadoPago", "FAILED"] }, 1, 0],
            },
          },
        },
      },
    ]),
    PaymentTransaction.aggregate([
      { $match: buildMatch(dateMatch) },
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
          monto: { $sum: "$monto" },
        },
      },
      { $sort: { cantidad: -1 } },
    ]),
    Pedido.aggregate([
      {
        $match: {
          ...pedidoMatch,
          estadoPedido: "CANCELLED",
        },
      },
      {
        $group: {
          _id: "$canal",
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { cantidad: -1 } },
    ]),
  ]);

  return {
    pedidosCancelados: pedidos[0]?.pedidosCancelados || 0,
    pedidosRefunded: pedidos[0]?.pedidosRefunded || 0,
    pedidosFailed: pedidos[0]?.pedidosFailed || 0,
    transaccionesPorEstado: payments,
    cancelacionesPorCanal: cancellationByChannel,
  };
}

export async function getInventoryRotationReport(request: Request) {
  await connectDB();
  const { dateMatch, limit } = parseReportFilters(request);

  return Inventario.aggregate([
    {
      $match: {
        ...buildMatch(dateMatch),
        tipo: { $in: ["SALIDA", "DEVOLUCION"] },
      },
    },
    {
      $group: {
        _id: {
          productoId: "$productoId",
          varianteId: "$variante.varianteId",
          color: "$variante.color",
          talla: "$variante.talla",
        },
        nombre: { $first: "$productoSnapshot.nombre" },
        modelo: { $first: "$productoSnapshot.modelo" },
        sku: { $first: "$productoSnapshot.sku" },
        salidas: {
          $sum: {
            $cond: [{ $eq: ["$tipo", "SALIDA"] }, "$cantidad", 0],
          },
        },
        devoluciones: {
          $sum: {
            $cond: [{ $eq: ["$tipo", "DEVOLUCION"] }, "$cantidad", 0],
          },
        },
        movimientos: { $sum: 1 },
      },
    },
    {
      $addFields: {
        rotacionNeta: { $subtract: ["$salidas", "$devoluciones"] },
      },
    },
    { $sort: { rotacionNeta: -1, salidas: -1 } },
    { $limit: limit },
  ]);
}
