import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { updatePerfilSchema } from "@/schemas/perfil.schema";
import { resolveApiAuth } from "@/libs/resolveApiAuth";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { getCustomerContextByUserId } from "@/modules/customers/application/customers.service";

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    const context = await getCustomerContextByUserId(userAuth.id, {
      ensureProfile: userAuth.role === "CLIENTE",
    });

    return NextResponse.json({
      ...context.user,
      customerProfile: context.profile,
      defaultAddress: context.defaultAddress,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener perfil",
      logLabel: "GET perfil error:",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    const userId = userAuth.id;

    const validation = await validateRequest(updatePerfilSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const data = validation.data;

    await connectDB();

    const existingUser = await User.findOne({
      email: data.email,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Ese email ya esta en uso por otro usuario" },
        { status: 409 }
      );
    }

    const updateData: {
      fullname: string;
      email: string;
      password?: string;
    } = {
      fullname: data.fullname,
      email: data.email,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const context = await getCustomerContextByUserId(userAuth.id, {
      ensureProfile: user.role === "CLIENTE",
    });

    return NextResponse.json({
      ...context.user,
      customerProfile: context.profile,
      defaultAddress: context.defaultAddress,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar perfil",
      logLabel: "PUT perfil error:",
    });
  }
}
