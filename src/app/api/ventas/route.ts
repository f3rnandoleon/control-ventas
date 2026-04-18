import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { createVentaSchema } from "@/schemas/venta.schema";
import {
  createDirectSale,
  listSales,
} from "@/modules/sales/application/sales.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function POST(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const validation = await validateRequest(createVentaSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { venta, order } = await createDirectSale(userAuth, validation.data);

    return NextResponse.json(
      {
        message: "Venta registrada correctamente",
        venta: {
          _id: venta._id,
          numeroVenta: venta.numeroVenta,
          estado: venta.estado,
          subtotal: venta.subtotal,
          descuento: venta.descuento,
          total: venta.total,
          metodoPago: venta.metodoPago,
          tipoVenta: venta.tipoVenta,
          createdAt: venta.createdAt,
          items: venta.items,
          delivery: venta.delivery,
        },
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al registrar la venta",
      logLabel: "VENTA ERROR:",
    });
  }
}

export async function GET() {
  try {
    const ventas = await listSales();
    return NextResponse.json(ventas);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener ventas",
      logLabel: "GET ventas error:",
    });
  }
}
