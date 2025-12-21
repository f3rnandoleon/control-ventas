import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";

export async function GET() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 403 }
    );
  }

  await connectDB();
  const users = await User.find()
    .select("-password")
    .sort({ createdAt: -1 });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, fullname, role: userRole, password } = body;

  if (!password || password.trim() === "") {
    return NextResponse.json(
      { message: "La contraseña es obligatoria" },
      { status: 400 }
    );
  }

  await connectDB();

  const exists = await User.findOne({ email });
  if (exists) {
    return NextResponse.json(
      { message: "Email ya existe" },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email,
    fullname,
    role: userRole,
    password: hash,
  });

  return NextResponse.json(
    {
      message: "Usuario creado",
      user: {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        isActive: user.isActive,
      },
    },
    { status: 201 }
  );
}
