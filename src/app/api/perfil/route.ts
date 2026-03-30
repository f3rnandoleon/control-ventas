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

export async function GET(request: Request) {
  try {
    const userAuth = await resolveApiAuth(request);

    if (!userAuth) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 }
      );
    }

    const userId = userAuth.id;

    await connectDB();

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET perfil error:", error);
    return NextResponse.json(
      { message: "Error al obtener perfil" },
      { status: 500 }
    );
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT perfil error:", error);
    return NextResponse.json(
      { message: "Error al actualizar perfil" },
      { status: 500 }
    );
  }
}
