import { NextResponse } from "next/server";
import { connectDB } from "@/libs/mongodb";
import Sucursal from "@/models/sucursal";
import { handleRouteError } from "@/shared/http/handleRouteError";
import { requireAdminApiAuth, requireStaffApiAuth } from "@/libs/requireApiAuth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    await connectDB();

    const sucursal = await Sucursal.findById(id).lean();
    if (!sucursal) {
      return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json(sucursal);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al obtener sucursal",
      logLabel: "GET /api/admin/sucursales/[id] error:",
    });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    await connectDB();

    // Si se marca como almacén principal, desmarcar otros
    if (body.esAlmacenPrincipal) {
      await Sucursal.updateMany(
        { _id: { $ne: id }, esAlmacenPrincipal: true },
        { esAlmacenPrincipal: false }
      );
    }

    const updated = await Sucursal.findByIdAndUpdate(
      id,
      {
        nombre: body.nombre,
        tipo: body.tipo,
        direccion: body.direccion,
        ciudad: body.ciudad,
        telefono: body.telefono,
        permiteVentaPOS: body.permiteVentaPOS,
        permiteDespachoWeb: body.permiteDespachoWeb,
        permiteRetiroCliente: body.permiteRetiroCliente,
        esAlmacenPrincipal: body.esAlmacenPrincipal,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al actualizar sucursal",
      logLabel: "PUT /api/admin/sucursales/[id] error:",
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApiAuth(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    await connectDB();

    const sucursal = await Sucursal.findById(id);
    if (!sucursal) {
      return NextResponse.json({ message: "Sucursal no encontrada" }, { status: 404 });
    }

    if (body.activa !== undefined) {
      // Si intentan desactivar el almacén principal único, advertir
      if (!body.activa && sucursal.esAlmacenPrincipal) {
        return NextResponse.json(
          { message: "No puedes desactivar el almacén central principal. Asígnalo a otra sucursal primero." },
          { status: 400 }
        );
      }
      sucursal.activa = body.activa;
    }

    await sucursal.save();
    return NextResponse.json(sucursal);
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al modificar estado de la sucursal",
      logLabel: "PATCH /api/admin/sucursales/[id] error:",
    });
  }
}
