import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Pedido from "@/models/pedido";
import Gasto from "@/models/gasto";
import CuentaDinero from "@/models/cuentaDinero";
import MovimientoCuenta from "@/models/movimientoCuenta";
import CierrePeriodo from "@/models/cierrePeriodo";
import Sucursal from "@/models/sucursal";
import DevolucionCambio from "@/models/devolucionCambio";
import { AppError } from "@/shared/errors/AppError";
import { assertObjectId } from "@/utils/validacion";
import type {
  EstadoResultadosFiltros,
  EstadoResultadosReporte,
  FlujoCajaReporte,
  FlujoCajaCuentaResumen,
  DesgloseCategoriaGasto,
  DesgloseSucursalPL,
  CierrePeriodoItem,
} from "@/types/reporteFinanciero";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export async function generarEstadoResultados(
  filtros: EstadoResultadosFiltros
): Promise<EstadoResultadosReporte> {
  await connectDB();

  const fechaDesde = new Date(filtros.desde);
  const fechaHasta = new Date(filtros.hasta);
  fechaHasta.setHours(23, 59, 59, 999);

  // 1. Filtros de pedidos
  const pedidoQuery: Record<string, unknown> = {
    createdAt: { $gte: fechaDesde, $lte: fechaHasta },
    estadoPago: "PAID",
    estadoPedido: { $nin: ["CANCELLED"] },
  };

  if (filtros.sucursalId && mongoose.Types.ObjectId.isValid(filtros.sucursalId)) {
    pedidoQuery.sucursalId = new mongoose.Types.ObjectId(filtros.sucursalId);
  }

  const pedidos = await Pedido.find(pedidoQuery).lean();

  let ventasBrutas = 0;
  let descuentos = 0;
  let ventasNetas = 0;
  let costoVentasCOGS = 0;
  let prendasVendidas = 0;

  for (const ped of pedidos) {
    const totalPed = Number(ped.total || 0);
    const descPed = Number(ped.descuento || 0);
    const subtotalPed = Number(ped.subtotal || totalPed + descPed);

    ventasBrutas += subtotalPed;
    descuentos += descPed;
    ventasNetas += totalPed;

    for (const it of ped.items || []) {
      const cant = Number(it.cantidad || 0);
      prendasVendidas += cant;
      const costoUnit = Number(it.precioCosto || 0);
      costoVentasCOGS += cant * costoUnit;
    }
  }

  ventasBrutas = Number(ventasBrutas.toFixed(2));
  descuentos = Number(descuentos.toFixed(2));
  ventasNetas = Number(ventasNetas.toFixed(2));
  costoVentasCOGS = Number(costoVentasCOGS.toFixed(2));
  const utilidadBruta = Number((ventasNetas - costoVentasCOGS).toFixed(2));
  const margenBrutoPorcentaje =
    ventasNetas > 0 ? Number(((utilidadBruta / ventasNetas) * 100).toFixed(2)) : 0;

  // 2. Gastos Operativos
  const gastoQuery: Record<string, unknown> = {
    fecha: { $gte: fechaDesde, $lte: fechaHasta },
  };
  if (filtros.sucursalId && mongoose.Types.ObjectId.isValid(filtros.sucursalId)) {
    gastoQuery.sucursalId = new mongoose.Types.ObjectId(filtros.sucursalId);
  }

  const gastos = await Gasto.find(gastoQuery).lean();

  let gastosFijos = 0;
  let gastosVariables = 0;
  const mapaCategorias: Record<string, { naturaleza: "FIJO" | "VARIABLE"; monto: number }> = {};

  for (const g of gastos) {
    const monto = Number(g.monto || 0);
    if (g.naturaleza === "FIJO") {
      gastosFijos += monto;
    } else {
      gastosVariables += monto;
    }

    if (!mapaCategorias[g.categoria]) {
      mapaCategorias[g.categoria] = {
        naturaleza: g.naturaleza as "FIJO" | "VARIABLE",
        monto: 0,
      };
    }
    mapaCategorias[g.categoria].monto += monto;
  }

  gastosFijos = Number(gastosFijos.toFixed(2));
  gastosVariables = Number(gastosVariables.toFixed(2));
  const gastosOperativosTotal = Number((gastosFijos + gastosVariables).toFixed(2));

  const gastosPorCategoria: DesgloseCategoriaGasto[] = Object.entries(mapaCategorias).map(
    ([categoria, data]) => ({
      categoria,
      naturaleza: data.naturaleza,
      monto: Number(data.monto.toFixed(2)),
    })
  );

  // 3. Mermas / Daños en el periodo
  const devQuery: Record<string, unknown> = {
    createdAt: { $gte: fechaDesde, $lte: fechaHasta },
  };
  if (filtros.sucursalId && mongoose.Types.ObjectId.isValid(filtros.sucursalId)) {
    devQuery.sucursalId = new mongoose.Types.ObjectId(filtros.sucursalId);
  }

  const devoluciones = await DevolucionCambio.find(devQuery).lean();
  let mermasTotal = 0;

  for (const dev of devoluciones) {
    for (const item of dev.itemsDevueltos || []) {
      if (item.destinoFisico === "MERMA_DANADO") {
        const costoPerdido = Number(item.precioCosto || 0) * Number(item.cantidad || 0);
        mermasTotal += costoPerdido;
      }
    }
  }
  mermasTotal = Number(mermasTotal.toFixed(2));

  // 4. Utilidad Neta
  const utilidadNeta = Number(
    (utilidadBruta - gastosOperativosTotal - mermasTotal).toFixed(2)
  );
  const margenNetoPorcentaje =
    ventasNetas > 0 ? Number(((utilidadNeta / ventasNetas) * 100).toFixed(2)) : 0;

  // 5. Desglose por Sucursales (si no se filtró por una sucursal única)
  const desglosePorSucursales: DesgloseSucursalPL[] = [];
  const sucursales = (await Sucursal.find({ activa: true }).lean()) as unknown as Array<{
    _id: string;
    nombre: string;
    codigo: string;
  }>;

  for (const suc of sucursales) {
    const pedsSuc = pedidos.filter(
      (p) => p.sucursalId && p.sucursalId.toString() === suc._id.toString()
    );

    let vBrutasSuc = 0;
    let descSuc = 0;
    let vNetasSuc = 0;
    let cogsSuc = 0;

    for (const p of pedsSuc) {
      const tot = Number(p.total || 0);
      const desc = Number(p.descuento || 0);
      const sub = Number(p.subtotal || tot + desc);
      vBrutasSuc += sub;
      descSuc += desc;
      vNetasSuc += tot;

      for (const it of p.items || []) {
        cogsSuc += Number(it.cantidad || 0) * Number(it.precioCosto || 0);
      }
    }

    const gastosSuc = gastos
      .filter((g) => g.sucursalId && g.sucursalId.toString() === suc._id.toString())
      .reduce((acc, g) => acc + Number(g.monto || 0), 0);

    const mermasSuc = devoluciones
      .filter((d) => d.sucursalId && d.sucursalId.toString() === suc._id.toString())
      .reduce((acc, d) => {
        let m = 0;
        for (const it of d.itemsDevueltos || []) {
          if (it.destinoFisico === "MERMA_DANADO") {
            m += Number(it.precioCosto || 0) * Number(it.cantidad || 0);
          }
        }
        return acc + m;
      }, 0);

    const uBrutaSuc = Number((vNetasSuc - cogsSuc).toFixed(2));
    const uNetaSuc = Number((uBrutaSuc - gastosSuc - mermasSuc).toFixed(2));

    desglosePorSucursales.push({
      sucursalId: suc._id.toString(),
      nombreSucursal: suc.nombre,
      codigoSucursal: suc.codigo,
      ventasBrutas: Number(vBrutasSuc.toFixed(2)),
      descuentos: Number(descSuc.toFixed(2)),
      ventasNetas: Number(vNetasSuc.toFixed(2)),
      costoVentasCOGS: Number(cogsSuc.toFixed(2)),
      utilidadBruta: uBrutaSuc,
      gastosOperativos: Number(gastosSuc.toFixed(2)),
      mermas: Number(mermasSuc.toFixed(2)),
      utilidadNeta: uNetaSuc,
    });
  }

  let sucursalFiltroInfo = null;
  if (filtros.sucursalId) {
    const foundBranch = sucursales.find(
      (s) => s._id.toString() === filtros.sucursalId
    );
    if (foundBranch) {
      sucursalFiltroInfo = {
        id: foundBranch._id.toString(),
        nombre: foundBranch.nombre,
      };
    }
  }

  return {
    periodo: {
      desde: filtros.desde,
      hasta: filtros.hasta,
    },
    sucursalFiltro: sucursalFiltroInfo,
    metricas: {
      ventasBrutas,
      descuentos,
      ventasNetas,
      costoVentasCOGS,
      utilidadBruta,
      margenBrutoPorcentaje,
      gastosFijos,
      gastosVariables,
      gastosOperativosTotal,
      mermasTotal,
      utilidadNeta,
      margenNetoPorcentaje,
      cantidadPedidos: pedidos.length,
      prendasVendidas,
    },
    gastosPorCategoria,
    desglosePorSucursales,
  };
}

export async function generarFlujoCaja(filtros: {
  desde: string;
  hasta: string;
}): Promise<FlujoCajaReporte> {
  await connectDB();

  const fechaDesde = new Date(filtros.desde);
  const fechaHasta = new Date(filtros.hasta);
  fechaHasta.setHours(23, 59, 59, 999);

  const cuentas = (await CuentaDinero.find({ activa: true }).lean()) as unknown as Array<{
    _id: string;
    nombre: string;
    tipo: string;
    moneda: string;
    saldoInicial?: number;
  }>;

  let totalIngresosGlobal = 0;
  let totalEgresosGlobal = 0;
  const cuentasResumen: FlujoCajaCuentaResumen[] = [];

  for (const c of cuentas) {
    // Saldo inicial estimado (movimientos antes de fechaDesde + saldoInicial configurado)
    const movsPrevios = await MovimientoCuenta.aggregate([
      {
        $match: {
          cuentaId: c._id,
          createdAt: { $lt: fechaDesde },
        },
      },
      {
        $group: {
          _id: null,
          totalIngresos: {
            $sum: { $cond: [{ $eq: ["$tipo", "INGRESO"] }, "$monto", 0] },
          },
          totalEgresos: {
            $sum: { $cond: [{ $eq: ["$tipo", "EGRESO"] }, "$monto", 0] },
          },
        },
      },
    ]);

    const inicialConfig = Number(c.saldoInicial || 0);
    const sumaIngresosPrev = movsPrevios[0]?.totalIngresos || 0;
    const sumaEgresosPrev = movsPrevios[0]?.totalEgresos || 0;
    const saldoInicialEstimado = Number(
      (inicialConfig + sumaIngresosPrev - sumaEgresosPrev).toFixed(2)
    );

    // Movimientos dentro del periodo
    const movsPeriodo = await MovimientoCuenta.aggregate([
      {
        $match: {
          cuentaId: c._id,
          createdAt: { $gte: fechaDesde, $lte: fechaHasta },
        },
      },
      {
        $group: {
          _id: null,
          ingresos: {
            $sum: { $cond: [{ $eq: ["$tipo", "INGRESO"] }, "$monto", 0] },
          },
          egresos: {
            $sum: { $cond: [{ $eq: ["$tipo", "EGRESO"] }, "$monto", 0] },
          },
        },
      },
    ]);

    const totalIngresos = Number((movsPeriodo[0]?.ingresos || 0).toFixed(2));
    const totalEgresos = Number((movsPeriodo[0]?.egresos || 0).toFixed(2));
    const flujoNeto = Number((totalIngresos - totalEgresos).toFixed(2));
    const saldoFinalEstimado = Number((saldoInicialEstimado + flujoNeto).toFixed(2));

    totalIngresosGlobal += totalIngresos;
    totalEgresosGlobal += totalEgresos;

    cuentasResumen.push({
      cuentaId: c._id.toString(),
      nombreCuenta: c.nombre,
      tipoCuenta: c.tipo,
      moneda: c.moneda,
      saldoInicialEstimado,
      totalIngresos,
      totalEgresos,
      flujoNeto,
      saldoFinalEstimado,
    });
  }

  totalIngresosGlobal = Number(totalIngresosGlobal.toFixed(2));
  totalEgresosGlobal = Number(totalEgresosGlobal.toFixed(2));
  const flujoNetoGlobal = Number(
    (totalIngresosGlobal - totalEgresosGlobal).toFixed(2)
  );

  return {
    periodo: {
      desde: filtros.desde,
      hasta: filtros.hasta,
    },
    resumenGlobal: {
      totalIngresos: totalIngresosGlobal,
      totalEgresos: totalEgresosGlobal,
      flujoNeto: flujoNetoGlobal,
    },
    cuentas: cuentasResumen,
  };
}

export async function cerrarPeriodoContable(
  anio: number,
  mes: number,
  usuarioId: string,
  observaciones?: string
): Promise<CierrePeriodoItem> {
  assertObjectId(usuarioId, "Usuario no autenticado");
  if (mes < 1 || mes > 12) {
    throw new AppError("Mes inválido (debe ser entre 1 y 12)", 400);
  }

  await connectDB();

  const existe = await CierrePeriodo.findOne({ anio, mes });
  if (existe && existe.bloqueado) {
    throw new AppError(`El periodo ${NOMBRES_MESES[mes - 1]} ${anio} ya se encuentra cerrado`, 400);
  }

  // Calcular la fecha inicial y final del mes
  const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
  const ultimoDia = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

  // Calcular el resultado económico final al cierre
  const pl = await generarEstadoResultados({
    desde: primerDia.toISOString().split("T")[0],
    hasta: ultimoDia.toISOString().split("T")[0],
  });

  const doc = await CierrePeriodo.findOneAndUpdate(
    { anio, mes },
    {
      anio,
      mes,
      mesNombre: `${NOMBRES_MESES[mes - 1]} ${anio}`,
      bloqueado: true,
      cerradoPor: new mongoose.Types.ObjectId(usuarioId),
      fechaCierre: new Date(),
      utilidadNetaAlCierre: pl.metricas.utilidadNeta,
      observaciones: observaciones || "",
    },
    { upsert: true, new: true }
  ).populate("cerradoPor", "nombreCompleto email");

  return doc.toObject();
}

export async function listarPeriodosCerrados(): Promise<CierrePeriodoItem[]> {
  await connectDB();
  const periodos = await CierrePeriodo.find()
    .populate("cerradoPor", "nombreCompleto email")
    .sort({ anio: -1, mes: -1 })
    .lean();

  return periodos as unknown as CierrePeriodoItem[];
}

export async function reabrirPeriodoContable(id: string, usuarioId: string) {
  assertObjectId(id, "ID de cierre inválido");
  assertObjectId(usuarioId, "Usuario no autenticado");
  await connectDB();

  const cierre = await CierrePeriodo.findById(id);
  if (!cierre) {
    throw new AppError("Cierre de periodo no encontrado", 404);
  }

  cierre.bloqueado = false;
  cierre.observaciones = `${cierre.observaciones || ""} [Reabierto temporalmente por admin]`.trim();
  await cierre.save();

  return { success: true, message: `Periodo ${cierre.mesNombre} reabierto con éxito` };
}
