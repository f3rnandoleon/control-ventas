import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";
import Inventario from "@/models/inventario";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import type {
  KardexConsolidadoResumen,
  KardexConsolidadoProducto,
  KardexConsolidadoVariante,
  KardexMovimiento,
} from "@/types/inventario";
import type { Variante, Producto as ProductoType } from "@/types/producto";

export async function getKardexConsolidado(): Promise<KardexConsolidadoResumen> {
  await connectDB();

  const productos = (await Producto.find().sort({ nombre: 1 }).lean()) as unknown as (ProductoType & { _id: string })[];

  let totalVariantesCount = 0;
  let totalPrendasFisicas = 0;
  let capitalTotalInvertidoCosto = 0;
  let valorTotalPotencialVenta = 0;

  const productosConsolidados: KardexConsolidadoProducto[] = [];

  for (const prod of productos) {
    const variantes = (prod.variantes || []) as Variante[];
    const variantesConsolidadas: KardexConsolidadoVariante[] = [];

    let prodStockTotal = 0;
    let prodValorCostoTotal = 0;
    let prodValorVentaTotal = 0;

    for (const v of variantes) {
      totalVariantesCount++;
      const stock = Math.max(0, Number(v.stock || 0));
      const precioCosto = Number(
        v.precioCosto !== undefined && v.precioCosto !== null && Number(v.precioCosto) > 0
          ? v.precioCosto
          : prod.precioCosto || 0
      );
      const precioVenta = Number(
        v.precioVenta !== undefined && v.precioVenta !== null && Number(v.precioVenta) > 0
          ? v.precioVenta
          : prod.precioVenta || 0
      );

      const valorTotalCosto = Number((stock * precioCosto).toFixed(2));
      const valorTotalVenta = Number((stock * precioVenta).toFixed(2));

      prodStockTotal += stock;
      prodValorCostoTotal += valorTotalCosto;
      prodValorVentaTotal += valorTotalVenta;

      variantesConsolidadas.push({
        varianteId: v.varianteId,
        color: v.color,
        colorSecundario: v.colorSecundario,
        talla: v.talla,
        stock,
        precioCosto,
        precioVenta,
        valorTotalCosto,
        valorTotalVenta,
      });
    }

    totalPrendasFisicas += prodStockTotal;
    capitalTotalInvertidoCosto += prodValorCostoTotal;
    valorTotalPotencialVenta += prodValorVentaTotal;

    const cpp =
      prodStockTotal > 0
        ? Number((prodValorCostoTotal / prodStockTotal).toFixed(2))
        : Number(prod.precioCosto || 0);

    const precioVentaProm =
      prodStockTotal > 0
        ? Number((prodValorVentaTotal / prodStockTotal).toFixed(2))
        : Number(prod.precioVenta || 0);

    const margenMonto = prodValorVentaTotal - prodValorCostoTotal;
    const margenPorcentaje =
      prodValorVentaTotal > 0
        ? Number(((margenMonto / prodValorVentaTotal) * 100).toFixed(2))
        : 0;

    productosConsolidados.push({
      productoId: String(prod._id),
      nombre: prod.nombre,
      modelo: prod.modelo,
      sku: prod.sku,
      categoria: prod.categoria,
      stockTotal: prodStockTotal,
      costoPromedioPonderado: cpp,
      precioVentaPromedio: precioVentaProm,
      valorTotalInventarioCosto: Number(prodValorCostoTotal.toFixed(2)),
      valorTotalInventarioVenta: Number(prodValorVentaTotal.toFixed(2)),
      margenBrutoEstimadoPorcentaje: margenPorcentaje,
      margenBrutoEstimadoMonto: Number(margenMonto.toFixed(2)),
      variantes: variantesConsolidadas,
    });
  }

  const margenGlobalMonto = valorTotalPotencialVenta - capitalTotalInvertidoCosto;
  const margenGlobalPorcentaje =
    valorTotalPotencialVenta > 0
      ? Number(((margenGlobalMonto / valorTotalPotencialVenta) * 100).toFixed(2))
      : 0;

  return {
    totalProductos: productos.length,
    totalVariantes: totalVariantesCount,
    totalPrendasFisicas,
    capitalTotalInvertidoCosto: Number(capitalTotalInvertidoCosto.toFixed(2)),
    valorTotalPotencialVenta: Number(valorTotalPotencialVenta.toFixed(2)),
    margenBrutoGlobalPorcentaje: margenGlobalPorcentaje,
    margenBrutoGlobalMonto: Number(margenGlobalMonto.toFixed(2)),
    productos: productosConsolidados,
  };
}

export async function getKardexPorProducto(
  productoId: string,
  varianteId?: string,
  sucursalId?: string
) {
  assertObjectId(productoId, "ID de producto inválido");
  await connectDB();

  const producto = (await Producto.findById(productoId).lean()) as unknown as (ProductoType & { _id: string }) | null;
  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const query: Record<string, unknown> = { productoId };
  if (varianteId) {
    query["variante.varianteId"] = varianteId;
  }
  if (sucursalId) {
    query["sucursalId"] = sucursalId;
  }

  const movimientos = await Inventario.find(query)
    .populate("usuario", "nombreCompleto email")
    .populate("sucursalId", "nombre codigo tipo")
    .sort({ createdAt: 1 })
    .lean();

  let runningSaldoFisico = 0;
  let runningSaldoValorado = 0;
  let runningCostoPromedio = Number(producto.precioCosto || 0);

  const kardexMovimientos: KardexMovimiento[] = [];

  for (const mov of movimientos) {
    const cantidad = Number(mov.cantidad || 0);
    let entradaCantidad = 0;
    let salidaCantidad = 0;
    let debe = 0;
    let haber = 0;

    const costoUnitarioMov = Number(
      mov.costoUnitario !== undefined && mov.costoUnitario !== null && Number(mov.costoUnitario) > 0
        ? mov.costoUnitario
        : runningCostoPromedio
    );

    const esEntrada =
      mov.tipo === "ENTRADA" ||
      mov.tipo === "DEVOLUCION" ||
      mov.tipo === "TRASPASO_ENTRADA";

    if (esEntrada) {
      entradaCantidad = cantidad;
      debe = Number((entradaCantidad * costoUnitarioMov).toFixed(2));
      
      const nuevoSaldoFisico = runningSaldoFisico + entradaCantidad;
      const nuevoSaldoValorado = runningSaldoValorado + debe;
      
      runningSaldoFisico = nuevoSaldoFisico;
      runningSaldoValorado = nuevoSaldoValorado;
      runningCostoPromedio =
        runningSaldoFisico > 0
          ? Number((runningSaldoValorado / runningSaldoFisico).toFixed(2))
          : costoUnitarioMov;
    } else {
      // SALIDA, TRASPASO_SALIDA o AJUSTE negativo
      salidaCantidad = cantidad;
      haber = Number((salidaCantidad * runningCostoPromedio).toFixed(2));
      
      runningSaldoFisico = Math.max(0, runningSaldoFisico - salidaCantidad);
      runningSaldoValorado = Math.max(0, runningSaldoValorado - haber);
      
      if (runningSaldoFisico === 0) {
        runningSaldoValorado = 0;
      }
    }

    const sucursalNombre =
      mov.sucursalId && typeof mov.sucursalId === "object"
        ? (mov.sucursalId as { nombre?: string }).nombre
        : undefined;

    kardexMovimientos.push({
      _id: String(mov._id),
      fecha: mov.createdAt ? new Date(mov.createdAt).toISOString() : new Date().toISOString(),
      tipo: mov.tipo,
      sucursal: sucursalNombre,
      referencia: mov.referencia || "-",
      motivo: mov.motivo || "-",
      usuario: mov.usuario && typeof mov.usuario === "object" ? (mov.usuario as { nombreCompleto?: string }).nombreCompleto || "Sistema" : "Sistema",
      variante: {
        color: mov.variante?.color || "N/A",
        talla: mov.variante?.talla || "N/A",
      },
      entradaCantidad,
      salidaCantidad,
      saldoCantidad: runningSaldoFisico,
      costoUnitario: costoUnitarioMov,
      debe,
      haber,
      saldoValorado: Number(runningSaldoValorado.toFixed(2)),
      costoPromedio: runningCostoPromedio,
    });
  }

  return {
    producto: {
      _id: String(producto._id),
      nombre: producto.nombre,
      modelo: producto.modelo,
      sku: producto.sku,
      categoria: producto.categoria,
      precioCostoBase: producto.precioCosto,
      precioVentaBase: producto.precioVenta,
      variantes: producto.variantes,
    },
    saldoFisicoActual: runningSaldoFisico,
    saldoValoradoActual: Number(runningSaldoValorado.toFixed(2)),
    costoPromedioActual: runningCostoPromedio,
    movimientos: kardexMovimientos.reverse(), // devolver más recientes primero para visualización tabular
  };
}
