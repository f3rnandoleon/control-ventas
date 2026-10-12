import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";
import { comprasRepository } from "@/modules/purchases/infrastructure/compras.repository";
import { inventoryRepository } from "@/modules/inventory/infrastructure/inventory.repository";
import { calcularCostoPromedioPonderado } from "@/utils/pricing";
import { AppError } from "@/shared/errors/AppError";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import type { CrearCompraInput } from "@/types/compra";
import type { Variante } from "@/types/producto";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import {
  getDefaultWarehouseId,
  increaseStockInBranch,
} from "@/modules/inventory/application/branch-stock.service";

export async function registrarCompra(
  input: CrearCompraInput,
  userIdRaw: string,
  session?: ClientSession
) {
  if (!mongoose.Types.ObjectId.isValid(userIdRaw)) {
    throw new AppError("Usuario no autenticado", 401);
  }

  await connectDB();

  if (!input.items || input.items.length === 0) {
    throw new AppError("La compra debe incluir al menos un ítem", 400);
  }

  const userId = new mongoose.Types.ObjectId(userIdRaw);
  const tipoCambio = Number(input.tipoCambio || 1);
  if (tipoCambio <= 0) {
    throw new AppError("El tipo de cambio debe ser mayor a 0", 400);
  }

  const sucursalDestinoId = input.sucursalDestinoId
    ? new mongoose.Types.ObjectId(input.sucursalDestinoId)
    : await getDefaultWarehouseId(session);

  const numeroCompra = await comprasRepository.generateNextNumeroCompra();

  let totalMonedaOrigen = 0;
  let totalBOB = 0;
  const processedItems = [];
  const inventoryMovementsToCreate = [];

  // Agrupar items por producto para optimizar queries y saves
  const productIds = [...new Set(input.items.map((i) => i.productoId))];
  const productosDocs = await Producto.find({
    _id: { $in: productIds },
  }).session(session ?? null);

  const productoMap = new Map(
    productosDocs.map((p) => [p._id.toString(), p])
  );

  for (const itemInput of input.items) {
    const producto = productoMap.get(itemInput.productoId);
    if (!producto) {
      throw new AppError(
        `Producto con ID ${itemInput.productoId} no encontrado`,
        404
      );
    }

    const variante = findVariantByIdentity(
      producto.variantes as Variante[],
      {
        varianteId: itemInput.varianteId,
        color: itemInput.color,
        colorSecundario: itemInput.colorSecundario,
        talla: itemInput.talla,
      }
    ) as Variante | undefined;

    if (!variante) {
      throw new AppError(
        `Variante (${itemInput.color} - ${itemInput.talla}) no encontrada en ${producto.nombre}`,
        404
      );
    }

    const cantidad = Number(itemInput.cantidad);
    if (cantidad <= 0 || !Number.isInteger(cantidad)) {
      throw new AppError("La cantidad debe ser un entero mayor a 0", 400);
    }

    const costoUnitarioOrigen = Number(itemInput.costoUnitarioOrigen);
    if (costoUnitarioOrigen <= 0) {
      throw new AppError("El costo unitario debe ser mayor a 0", 400);
    }

    // Convertir a BOB según moneda
    const costoUnitarioBOB =
      input.monedaOrigen === "PEN" || input.monedaOrigen === "USD"
        ? Number((costoUnitarioOrigen * tipoCambio).toFixed(2))
        : Number(costoUnitarioOrigen.toFixed(2));

    const totalLineaOrigen = Number((costoUnitarioOrigen * cantidad).toFixed(2));
    const totalLineaBOB = Number((costoUnitarioBOB * cantidad).toFixed(2));

    totalMonedaOrigen += totalLineaOrigen;
    totalBOB += totalLineaBOB;

    const stockAnterior = Number(variante.stock || 0);
    const costoAnteriorBOB = Number(
      variante.precioCosto !== undefined && variante.precioCosto !== null && Number(variante.precioCosto) > 0
        ? variante.precioCosto
        : producto.precioCosto || 0
    );

    // Calcular el nuevo Costo Promedio Ponderado (CPP)
    const nuevoCostoPromedioBOB = calcularCostoPromedioPonderado(
      stockAnterior,
      costoAnteriorBOB,
      cantidad,
      costoUnitarioBOB
    );

    const nuevoStock = stockAnterior + cantidad;

    // Actualizar variante en el documento de producto
    variante.stock = nuevoStock;
    variante.precioCosto = nuevoCostoPromedioBOB;

    // Si el producto no tiene precioCosto base o es igual al anterior, actualizar el base también
    if (!producto.precioCosto || producto.precioCosto <= 0 || producto.precioCosto === costoAnteriorBOB) {
      producto.precioCosto = nuevoCostoPromedioBOB;
    }

    processedItems.push({
      productoId: producto._id,
      varianteId: variante.varianteId || itemInput.varianteId,
      productoSnapshot: {
        nombre: producto.nombre,
        modelo: producto.modelo,
        sku: producto.sku,
      },
      varianteSnapshot: {
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        codigoBarra: variante.codigoBarra,
        imagen: getVarianteImagenPrincipal(variante),
      },
      cantidad,
      costoUnitarioOrigen,
      costoUnitarioBOB,
      totalLineaBOB,
      stockAnterior,
      costoAnteriorBOB,
      nuevoStock,
      nuevoCostoPromedioBOB,
    });

    const varianteIdFinal = (variante.varianteId || itemInput.varianteId) as string;

    await increaseStockInBranch(
      {
        sucursalId: sucursalDestinoId,
        productoId: producto._id,
        varianteId: varianteIdFinal,
        cantidad,
      },
      session
    );

    inventoryMovementsToCreate.push({
      productoId: producto._id,
      sucursalId: sucursalDestinoId,
      productoSnapshot: {
        nombre: producto.nombre,
        modelo: producto.modelo,
        sku: producto.sku,
      },
      variante: {
        varianteId: variante.varianteId || itemInput.varianteId,
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        codigoBarra: variante.codigoBarra,
      },
      tipo: "ENTRADA",
      cantidad,
      stockAnterior,
      stockActual: nuevoStock,
      costoUnitario: costoUnitarioBOB,
      valorTotalOperacion: totalLineaBOB,
      costoPromedioResultante: nuevoCostoPromedioBOB,
      saldoValorado: Number((nuevoStock * nuevoCostoPromedioBOB).toFixed(2)),
      motivo: input.proveedor
        ? `Compra a proveedor: ${input.proveedor}`
        : "Reabastecimiento de mercadería",
      referencia: numeroCompra,
      usuario: userId,
    });
  }

  // Guardar cambios en todos los productos modificados
  for (const producto of productosDocs) {
    await producto.save(session ? { session } : undefined);
  }

  // Crear la cabecera de la Compra
  const compra = await comprasRepository.create(
    {
      numeroCompra,
      sucursalDestinoId,
      fecha: input.fecha ? new Date(input.fecha) : new Date(),
      proveedor: input.proveedor,
      comprobanteReferencia: input.comprobanteReferencia,
      monedaOrigen: input.monedaOrigen,
      tipoCambio,
      totalMonedaOrigen: Number(totalMonedaOrigen.toFixed(2)),
      totalBOB: Number(totalBOB.toFixed(2)),
      items: processedItems,
      notas: input.notas,
      creadoPor: userId,
    },
    session
  );

  // Vincular compraId en los movimientos de inventario y guardarlos
  for (const mov of inventoryMovementsToCreate) {
    await inventoryRepository.create(
      {
        ...mov,
        compraId: compra._id,
      },
      session
    );
  }

  await recordAuditEventSafe({
    tipoEntidad: "COMPRA",
    idEntidad: compra._id.toString(),
    accion: "CREAR",
    estado: "SUCCESS",
    idActor: userIdRaw,
    rolActor: "ADMIN",
    metadata: {
      numeroCompra,
      totalBOB,
      totalItems: processedItems.length,
      monedaOrigen: input.monedaOrigen,
      tipoCambio,
    },
  });

  return compra;
}

export async function listarCompras(opts?: { page?: number; limit?: number }) {
  await connectDB();
  return comprasRepository.listAll(opts);
}

export async function obtenerCompraPorId(id: string) {
  await connectDB();
  const compra = await comprasRepository.findById(id);
  if (!compra) {
    throw new AppError("Compra no encontrada", 404);
  }
  return compra;
}
