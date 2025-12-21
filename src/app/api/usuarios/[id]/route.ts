import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 403 }
    );
  }

  const data = await request.json();

  await connectDB();

  const updateData: any = {
    fullname: data.fullname,
    email: data.email,
    role: data.role,
    isActive: data.isActive,
  };

  // 🔐 SOLO actualizar password si viene y no está vacío
  if (data.password && data.password.trim() !== "") {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const user = await User.findByIdAndUpdate(
    params.id,
    updateData,
    { new: true }
  ).select("-password");

  if (!user) {
    return NextResponse.json(
      { message: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}
