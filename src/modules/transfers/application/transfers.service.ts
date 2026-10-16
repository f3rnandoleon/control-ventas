import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Traspaso from "@/models/traspaso";
import Producto from "@/models/producto";
import Sucursal from "@/models/sucursal";
import NivelStock from "@/models/nivelStock";
import Inventario from "@/models/inventario";
import { AppError } from "@/shared/errors/AppError";
import { runInTransaction } from "@/shared/db/runTransaction";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import type {
  CrearTraspasoInput,
  DespacharTraspasoInput,
  RecibirTraspasoInput,
} from "@/types/traspaso";
import type { Variante } from "@/types/producto";
import { findVariantByIdentity } from "@/utils/varianteIdentity";

async function generateNextNumeroTraspaso(): Promise<string> {
  const anio = new Date().getFullYear();
  const count = await Traspaso.countDocuments();
  const siguiente = String(count + 1).padStart(4, "0");
  return `TRF-${anio}-${siguiente}`;
}

export async function crearSolicitudTraspaso(
  input: CrearTraspasoInput,
  userIdRaw: string,
  session?: ClientSession
) {
  if (input.sucursalOrigenId === input.sucursalDestinoId) {
    throw new AppError("La sucursal de origen y destino no pueden ser iguales", 400);
  }

  if (!input.items || input.items.length === 0) {
    throw new AppError("El traspaso debe contener al menos un ítem", 400);
  }

  await connectDB();

  const [origen, destino] = await Promise.all([
    Sucursal.findById(input.sucursalOrigenId).session(session ?? null),
    Sucursal.findById(input.sucursalDestinoId).session(session ?? null),
  ]);

  if (!origen || !destino) {
    throw new AppError("Sucursal de origen o destino no encontrada", 404);
  }

  const userId = new mongoose.Types.ObjectId(userIdRaw);
  const numeroTraspaso = await generateNextNumeroTraspaso();

  let totalPrendasEnviadas = 0;
  let valorTotalCostoTraspaso = 0;
  const processedItems = [];

  for (const item of input.items) {
    const rawQty = item.cantidad ?? item.cantidadEnviada;
    const qty = Number(rawQty);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      throw new AppError("La cantidad debe ser un entero positivo", 400);
    }

    const producto = await Producto.findById(item.productoId).session(session ?? null);
    if (!producto) {
      throw new AppError(`Producto con ID ${item.productoId} no encontrado`, 404);
    }

    const variante = findVariantByIdentity(producto.variantes as Variante[], {
      varianteId: item.varianteId,
    }) as Variante | undefined;

    if (!variante) {
      throw new AppError(`Variante ${item.varianteId} no encontrada en ${producto.nombre}`, 404);
    }

    // Verificar si hay stock físico suficiente en la sucursal de origen
    const nivelOrigen = await NivelStock.findOne(
      { sucursalId: origen._id, varianteId: item.varianteId },
      null,
      session ? { session } : undefined
    );

    const stockDisponibleOrigen = Math.max(
      0,
      Number(nivelOrigen?.stockFisico || 0) - Number(nivelOrigen?.stockReservado || 0)
    );

    if (stockDisponibleOrigen < qty) {
      throw new AppError(
        `Stock insuficiente en ${origen.nombre} para ${producto.nombre} (${variante.color} - ${variante.talla}). Disponible: ${stockDisponibleOrigen} u., Solicitado: ${qty} u.`,
        400
      );
    }

    // Costo unitario actual de la variante (el costo que viajará con la prenda)
    const costoUnitarioCPP = Number(
      variante.precioCosto !== undefined && variante.precioCosto !== null && Number(variante.precioCosto) > 0
        ? variante.precioCosto
        : producto.precioCosto || 0
    );

    totalPrendasEnviadas += qty;
    valorTotalCostoTraspaso += Number((qty * costoUnitarioCPP).toFixed(2));

    processedItems.push({
      productoId: producto._id,
      varianteId: variante.varianteId,
      productoSnapshot: {
        nombre: producto.nombre,
        sku: producto.sku,
        modelo: producto.modelo,
      },
      varianteSnapshot: {
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        codigoBarra: variante.codigoBarra,
        imagen: variante.imagenes?.[0] || undefined,
      },
      cantidadEnviada: qty,
      cantidadRecibida: 0,
      costoUnitarioCPP,
      notasItem: item.notasItem,
    });
  }

  const traspaso = await Traspaso.create(
    [
      {
        numeroTraspaso,
        sucursalOrigenId: origen._id,
        sucursalDestinoId: destino._id,
        estado: "SOLICITADA",
        items: processedItems,
        totalPrendasEnviadas,
        totalPrendasRecibidas: 0,
        valorTotalCostoTraspaso: Number(valorTotalCostoTraspaso.toFixed(2)),
        solicitadoPor: userId,
        motivo: input.motivo || "Reabastecimiento de tienda",
        notas: input.notas || input.notasEnvio || null,
      },
    ],
    { session }
  );

  return traspaso[0];
}

/**
 * Despachar Traspaso: Descuenta de la sucursal origen.
 * Pasa a estado EN_TRANSITO (el stock no está en origen ni en destino).
 */
export async function despacharTraspaso(
  input: DespacharTraspasoInput,
  userIdRaw: string
) {
  return runInTransaction(async (session) => {
    await connectDB();
    const traspaso = await Traspaso.findById(input.traspasoId).session(session);
    if (!traspaso) {
      throw new AppError("Traspaso no encontrado", 404);
    }

    if (traspaso.estado !== "SOLICITADA") {
      throw new AppError(`El traspaso no se puede despachar en estado ${traspaso.estado}`, 400);
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);

    // Descontar stock físico en la sucursal de origen y registrar movimiento en Kardex
    for (const item of traspaso.items) {
      const nivelOrigen = await NivelStock.findOne(
        { sucursalId: traspaso.sucursalOrigenId, varianteId: item.varianteId },
        null,
        { session }
      );

      const stockActualOrigen = Number(nivelOrigen?.stockFisico || 0);
      if (stockActualOrigen < item.cantidadEnviada) {
        throw new AppError(
          `Stock físico insuficiente en origen para ${item.productoSnapshot.nombre} (${item.varianteSnapshot.color} - ${item.varianteSnapshot.talla})`,
          400
        );
      }

      const nuevoStockOrigen = stockActualOrigen - item.cantidadEnviada;
      nivelOrigen.stockFisico = nuevoStockOrigen;
      await nivelOrigen.save({ session });

      // Registrar movimiento de SALIDA_TRASPASO en Inventario para Kardex
      await Inventario.create(
        [
          {
            productoId: item.productoId,
            sucursalId: traspaso.sucursalOrigenId,
            productoSnapshot: item.productoSnapshot,
            variante: {
              varianteId: item.varianteId,
              color: item.varianteSnapshot.color,
              colorSecundario: item.varianteSnapshot.colorSecundario,
              talla: item.varianteSnapshot.talla,
              codigoBarra: item.varianteSnapshot.codigoBarra,
            },
            tipo: "TRASPASO_SALIDA",
            cantidad: item.cantidadEnviada,
            stockAnterior: stockActualOrigen,
            stockActual: nuevoStockOrigen,
            costoUnitario: item.costoUnitarioCPP,
            valorTotalOperacion: Number((item.cantidadEnviada * item.costoUnitarioCPP).toFixed(2)),
            costoPromedioResultante: item.costoUnitarioCPP,
            saldoValorado: Number((nuevoStockOrigen * item.costoUnitarioCPP).toFixed(2)),
            motivo: `Despacho de traspaso hacia sucursal destino: ${traspaso.numeroTraspaso}`,
            referencia: traspaso.numeroTraspaso,
            usuario: userId,
          },
        ],
        { session }
      );
    }

    traspaso.estado = "EN_TRANSITO";
    traspaso.despachadoPor = userId;
    traspaso.fechaDespacho = new Date();
    if (input.notas) traspaso.notas = input.notas;
    await traspaso.save({ session });

    await recordAuditEventSafe({
      tipoEntidad: "TRASPASO",
      idEntidad: traspaso._id.toString(),
      accion: "DESPACHAR",
      estado: "SUCCESS",
      idActor: userIdRaw,
      rolActor: "ADMIN",
      metadata: {
        numeroTraspaso: traspaso.numeroTraspaso,
        totalPrendas: traspaso.totalPrendasEnviadas,
      },
    });

    return traspaso;
  });
}

/**
 * Recibir Traspaso: Suma a la sucursal destino con su costo CPP intacto.
 * Pasa a estado RECIBIDA.
 */
export async function recibirTraspaso(
  input: RecibirTraspasoInput,
  userIdRaw: string
) {
  return runInTransaction(async (session) => {
    await connectDB();
    const traspaso = await Traspaso.findById(input.traspasoId).session(session);
    if (!traspaso) {
      throw new AppError("Traspaso no encontrado", 404);
    }

    if (traspaso.estado !== "EN_TRANSITO") {
      throw new AppError(`El traspaso no se puede recibir en estado ${traspaso.estado}`, 400);
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);
    let totalPrendasRecibidas = 0;

    // Mapa de cantidades recibidas específicas si vinieron en el input
    const recibidosMap = new Map<string, number>();
    if (input.itemsRecibidos) {
      for (const ir of input.itemsRecibidos) {
        recibidosMap.set(ir.varianteId, ir.cantidadRecibida);
      }
    }

    for (const item of traspaso.items) {
      const cantRecibida = recibidosMap.has(item.varianteId)
        ? Math.max(0, Number(recibidosMap.get(item.varianteId)))
        : item.cantidadEnviada;

      item.cantidadRecibida = cantRecibida;
      totalPrendasRecibidas += cantRecibida;

      if (cantRecibida > 0) {
        // Incrementar o crear el NivelStock en destino
        const nivelDestino = await NivelStock.findOneAndUpdate(
          {
            sucursalId: traspaso.sucursalDestinoId,
            varianteId: item.varianteId,
          },
          {
            $inc: { stockFisico: cantRecibida },
            $setOnInsert: {
              productoId: item.productoId,
              stockReservado: 0,
              stockMinimo: 2,
            },
          },
          {
            new: true,
            upsert: true,
            session,
          }
        );

        const stockPrevioDestino = nivelDestino.stockFisico - cantRecibida;

        // Registrar movimiento de ENTRADA_TRASPASO en Inventario para Kardex
        await Inventario.create(
          [
            {
              productoId: item.productoId,
              sucursalId: traspaso.sucursalDestinoId,
              productoSnapshot: item.productoSnapshot,
              variante: {
                varianteId: item.varianteId,
                color: item.varianteSnapshot.color,
                colorSecundario: item.varianteSnapshot.colorSecundario,
                talla: item.varianteSnapshot.talla,
                codigoBarra: item.varianteSnapshot.codigoBarra,
              },
              tipo: "TRASPASO_ENTRADA",
              cantidad: cantRecibida,
              stockAnterior: stockPrevioDestino,
              stockActual: nivelDestino.stockFisico,
              costoUnitario: item.costoUnitarioCPP,
              valorTotalOperacion: Number((cantRecibida * item.costoUnitarioCPP).toFixed(2)),
              costoPromedioResultante: item.costoUnitarioCPP,
              saldoValorado: Number((nivelDestino.stockFisico * item.costoUnitarioCPP).toFixed(2)),
              motivo: `Recepción de traspaso desde sucursal origen: ${traspaso.numeroTraspaso}`,
              referencia: traspaso.numeroTraspaso,
              usuario: userId,
            },
          ],
          { session }
        );
      }
    }

    traspaso.estado = "RECIBIDA";
    traspaso.recibidoPor = userId;
    traspaso.fechaRecepcion = new Date();
    traspaso.totalPrendasRecibidas = totalPrendasRecibidas;
    if (input.notas) traspaso.notas = input.notas;
    await traspaso.save({ session });

    await recordAuditEventSafe({
      tipoEntidad: "TRASPASO",
      idEntidad: traspaso._id.toString(),
      accion: "RECIBIR",
      estado: "SUCCESS",
      idActor: userIdRaw,
      rolActor: "ADMIN",
      metadata: {
        numeroTraspaso: traspaso.numeroTraspaso,
        totalPrendasRecibidas,
      },
    });

    return traspaso;
  });
}

/**
 * Cancelar Traspaso
 */
export async function cancelarTraspaso(traspasoId: string, userIdRaw: string) {
  return runInTransaction(async (session) => {
    await connectDB();
    const traspaso = await Traspaso.findById(traspasoId).session(session);
    if (!traspaso) {
      throw new AppError("Traspaso no encontrado", 404);
    }

    if (traspaso.estado === "RECIBIDA") {
      throw new AppError("Un traspaso ya recibido no se puede cancelar", 400);
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);

    // Si ya estaba en tránsito, reingresar el stock a la sucursal origen
    if (traspaso.estado === "EN_TRANSITO") {
      for (const item of traspaso.items) {
        await NivelStock.findOneAndUpdate(
          { sucursalId: traspaso.sucursalOrigenId, varianteId: item.varianteId },
          { $inc: { stockFisico: item.cantidadEnviada } },
          { session }
        );

        await Inventario.create(
          [
            {
              productoId: item.productoId,
              sucursalId: traspaso.sucursalOrigenId,
              productoSnapshot: item.productoSnapshot,
              variante: {
                varianteId: item.varianteId,
                color: item.varianteSnapshot.color,
                colorSecundario: item.varianteSnapshot.colorSecundario,
                talla: item.varianteSnapshot.talla,
                codigoBarra: item.varianteSnapshot.codigoBarra,
              },
              tipo: "ENTRADA",
              cantidad: item.cantidadEnviada,
              stockAnterior: 0,
              stockActual: item.cantidadEnviada,
              costoUnitario: item.costoUnitarioCPP,
              motivo: `Cancelación y reingreso de traspaso: ${traspaso.numeroTraspaso}`,
              referencia: traspaso.numeroTraspaso,
              usuario: userId,
            },
          ],
          { session }
        );
      }
    }

    traspaso.estado = "CANCELADA";
    await traspaso.save({ session });
    return traspaso;
  });
}

export async function listarTraspasos(filtros?: {
  estado?: string;
  sucursalId?: string;
}) {
  await connectDB();
  const query: Record<string, unknown> = {};

  if (filtros?.estado) {
    query.estado = filtros.estado;
  }

  if (filtros?.sucursalId) {
    query.$or = [
      { sucursalOrigenId: filtros.sucursalId },
      { sucursalDestinoId: filtros.sucursalId },
    ];
  }

  return Traspaso.find(query)
    .populate("sucursalOrigenId", "nombre codigo tipo")
    .populate("sucursalDestinoId", "nombre codigo tipo")
    .populate("solicitadoPor", "nombreCompleto email")
    .populate("despachadoPor", "nombreCompleto email")
    .populate("recibidoPor", "nombreCompleto email")
    .sort({ createdAt: -1 })
    .lean();
}

export async function obtenerTraspasoPorId(id: string) {
  await connectDB();
  const traspaso = await Traspaso.findById(id)
    .populate("sucursalOrigenId", "nombre codigo tipo direccion")
    .populate("sucursalDestinoId", "nombre codigo tipo direccion")
    .populate("solicitadoPor", "nombreCompleto email")
    .populate("despachadoPor", "nombreCompleto email")
    .populate("recibidoPor", "nombreCompleto email")
    .lean();

  if (!traspaso) {
    throw new AppError("Traspaso no encontrado", 404);
  }

  return traspaso;
}
