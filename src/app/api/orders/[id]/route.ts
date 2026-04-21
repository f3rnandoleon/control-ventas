import { NextResponse } from "next/server";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { updateOrderStatusSchema } from "@/schemas/order.schema";
import {
  getOrderForActor,
  updateOrderStatusForStaff,
  cancelOrderForCustomer,
  updateOrderDeliveryForCustomer,
} from "@/modules/orders/application/orders.service";
import { handleRouteError } from "@/shared/http/handleRouteError";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const order = await getOrderForActor(userAuth.role, userAuth.id, id);

    return NextResponse.json(order);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener pedido",
      logLabel: "GET orders/[id] error:",
    });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;

    let order;
    if (["ADMIN", "VENDEDOR"].includes(userAuth.role)) {
      const validation = await validateRequest(updateOrderStatusSchema, request);
      if (!validation.success) {
        return validationErrorResponse(validation.errors);
      }
      order = await updateOrderStatusForStaff(id, validation.data);
    } else {
      // Flujo para CLIENTE
      const body = await request.json();

      if (body.orderStatus === "CANCELLED") {
        order = await cancelOrderForCustomer(id, userAuth.id);
      } else if (body.delivery) {
        // En este caso asumimos que si manda 'delivery' es para editar datos de envío
        order = await updateOrderDeliveryForCustomer(id, userAuth.id, body.delivery);
      } else {
        return NextResponse.json(
          { message: "Acción no permitida para clientes" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      message: "Pedido actualizado correctamente",
      order,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar pedido",
      logLabel: "PATCH orders/[id] error:",
    });
  }
}
