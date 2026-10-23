import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import { normalizeVariantImages, cleanupRemovedVariantImages } from "@/libs/cloudinary";
import { generarSKU } from "@/utils/generarSKU";
import { generarCodigoVariante } from "@/utils/generarCodigoVariante";
import { getVarianteImagenPrincipal, getVarianteImagenes } from "@/utils/varianteImagen";
import { ensureVariantIdentities } from "@/utils/varianteIdentity";
import { AppError } from "@/shared/errors/AppError";
import { catalogRepository } from "@/modules/catalog/infrastructure/catalog.repository";
import { PUBLIC_PRODUCT_PROJECTION } from "@/modules/catalog/domain/catalog.constants";
import {
  getVariantAvailableStock,
  matchesVariant,
  withComputedStock,
  withVariantAvailability,
  withWebVariantAvailability,
} from "@/modules/catalog/domain/variant.utils";
import { recordInventoryMovement } from "@/modules/inventory/application/inventory.service";
import {
  getWebStockMapForProducts,
  getDefaultWarehouseId,
} from "@/modules/inventory/application/branch-stock.service";
import NivelStock from "@/models/nivelStock";
import Sucursal from "@/models/sucursal";
import type { Variante, Producto } from "@/types/producto";

import { getVariantPricing } from "@/utils/pricing";

type ProductoPayload = Partial<Producto> & {
  variantes?: Variante[];
};

type CatalogVariantLike = Record<string, unknown> & {
  varianteId?: string;
  stock?: number | null;
  stockReservado?: number | null;
  stockDisponible?: number | null;
  sucursalesStock?: unknown[];
};

type CatalogProductLike = Record<string, unknown> & {
  variantes?: CatalogVariantLike[];
  stockTotal?: number;
  stockMinimo?: number;
};

export async function listCatalog(withStock: boolean, sucursalId?: string) {
  await connectDB();
  const productos = await catalogRepository.listAll();

  if (!withStock) {
    return productos.map((producto) =>
      withVariantAvailability(producto as CatalogProductLike)
    );
  }

  // Cargar sucursales activas y niveles de stock para enriquecer las variantes
  const sucursales = await Sucursal.find({ activa: true })
    .select("_id nombre codigo tipo permiteVentaPOS esAlmacenPrincipal")
    .sort({ esAlmacenPrincipal: -1, nombre: 1 })
    .lean();

  const niveles = await NivelStock.find({}).lean();
  const nivelMap = new Map<string, { stockFisico: number; stockReservado: number }>();
  for (const n of niveles) {
    if (n.sucursalId && n.varianteId) {
      nivelMap.set(`${n.sucursalId.toString()}_${n.varianteId}`, {
        stockFisico: Number(n.stockFisico || 0),
        stockReservado: Number(n.stockReservado || 0),
      });
    }
  }

  const productosConSucursales = productos.map((prod) => {
    const rawProd = prod as CatalogProductLike;
    const variantesOriginales = (rawProd.variantes || []) as (CatalogVariantLike & Record<string, unknown>)[];

    const variantesEnriquecidas = variantesOriginales.map((v) => {
      const varId = (v.varianteId as string) || "";
      const sucursalesStock = sucursales.map((s) => {
        const sId = String(s._id);
        const nivel = varId ? nivelMap.get(`${sId}_${varId}`) : undefined;
        const stockFisico = nivel ? Math.max(0, nivel.stockFisico) : 0;
        const stockReservado = nivel ? Math.max(0, nivel.stockReservado) : 0;
        return {
          sucursalId: sId,
          nombre: s.nombre as string,
          codigo: s.codigo as string,
          tipo: s.tipo as string,
          permiteVentaPOS: Boolean(s.permiteVentaPOS),
          esAlmacenPrincipal: Boolean(s.esAlmacenPrincipal),
          stockFisico,
          stockReservado,
          stockDisponible: Math.max(0, stockFisico - stockReservado),
        };
      });

      // Si se especificó una sucursal destino, el stock principal de la variante refleja esa sucursal
      if (sucursalId) {
        const branchMatch = sucursalesStock.find((b) => b.sucursalId === sucursalId);
        const stock = branchMatch ? branchMatch.stockFisico : 0;
        const stockReservado = branchMatch ? branchMatch.stockReservado : 0;
        const stockDisponible = branchMatch ? branchMatch.stockDisponible : 0;
        return {
          ...v,
          stock,
          stockReservado,
          stockDisponible,
          sucursalesStock,
        };
      }

      // Consolidado global: mantiene v.stock pero incluye sucursalesStock
      return {
        ...v,
        sucursalesStock,
      };
    });

    return {
      ...rawProd,
      variantes: variantesEnriquecidas,
    };
  });

  return productosConSucursales.map((producto) =>
    withVariantAvailability(
      withComputedStock(producto as CatalogProductLike)
    )
  );
}

export async function getCatalogProductById(id: string) {
  await connectDB();
  const producto = await catalogRepository.findById(id);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  return producto;
}

export async function createCatalogProduct(
  data: ProductoPayload,
  userId?: string | null
) {
  const { nombre, modelo } = data;

  await connectDB();

  const baseSku = generarSKU(nombre!, modelo!);
  let sku = baseSku;
  let skuCount = 2;
  
  while (await catalogRepository.findBySku(sku)) {
    sku = `${baseSku}-${skuCount}`;
    skuCount++;
  }

  const variantesNormalizadas = await normalizeVariantImages(
    (data.variantes ?? []) as Variante[]
  );

  const variantesConIdentidad = ensureVariantIdentities(
    variantesNormalizadas as Variante[]
  );

  const variantesProcesadas = variantesConIdentidad.map((variante, index) => {
    if (variante.codigoBarra && variante.qrCode) {
      return {
        ...variante,
        stockReservado: 0,
      };
    }

    const { codigoBarra, qrCode } = generarCodigoVariante({
      sku,
      color: variante.color,
      colorSecundario: variante.colorSecundario,
      talla: variante.talla,
      correlativo: index + 1,
    });

    return {
      ...variante,
      stockReservado: 0,
      codigoBarra: variante.codigoBarra || codigoBarra,
      qrCode: variante.qrCode || qrCode,
    };
  });

  const created = await catalogRepository.create({
    ...data,
    sku,
    creadoPor: userId,
    variantes: variantesProcesadas,
  });

  try {
    const defaultWarehouseId = await getDefaultWarehouseId();
    const niveles = (variantesProcesadas as Variante[]).map((v) => ({
      sucursalId: defaultWarehouseId,
      productoId: created._id,
      varianteId: v.varianteId,
      stockFisico: Math.max(0, Number(v.stock || 0)),
      stockReservado: 0,
      stockMinimo: 2,
    }));
    if (niveles.length > 0) {
      await NivelStock.insertMany(niveles, { ordered: false });
    }
  } catch (err) {
    console.warn("No se pudo inicializar NivelStock para el nuevo producto:", err);
  }

  return created;
}

export async function updateCatalogProduct(
  id: string,
  data: ProductoPayload,
  userIdRaw: string
) {
  if (!mongoose.Types.ObjectId.isValid(userIdRaw)) {
    throw new AppError("Usuario no autenticado", 401);
  }

  const userId = new mongoose.Types.ObjectId(userIdRaw);

  await connectDB();

  const productoAntes = await catalogRepository.findById(id);
  if (!productoAntes) {
    throw new AppError("Producto no encontrado", 404);
  }

  let nuevoSKU = productoAntes.sku;

  if (
    (data.nombre && data.nombre !== productoAntes.nombre) ||
    (data.modelo && data.modelo !== productoAntes.modelo)
  ) {
    const nombreFinal = data.nombre || productoAntes.nombre;
    const modeloFinal = data.modelo || productoAntes.modelo;
    const baseSku = generarSKU(nombreFinal, modeloFinal);
    nuevoSKU = baseSku;
    let skuCount = 2;
    
    while (await catalogRepository.findBySkuExcludingId(nuevoSKU, id)) {
      nuevoSKU = `${baseSku}-${skuCount}`;
      skuCount++;
    }
  }

  let variantesProcesadas = data.variantes;

  if (Array.isArray(data.variantes)) {
    const variantesNormalizadas = await normalizeVariantImages(
      data.variantes as Variante[]
    );

    const variantesConIdentidad = ensureVariantIdentities(
      variantesNormalizadas as Variante[]
    );

    variantesProcesadas = variantesConIdentidad.map((variante) => {
      const existentes = (productoAntes.variantes as Variante[]).filter((actual) =>
        matchesVariant(actual, variante)
      );
      const stockReservado = existentes[0]?.stockReservado || 0;

      if (variante.codigoBarra && variante.qrCode) {
        return {
          ...variante,
          stockReservado,
        };
      }

      const correlativo = existentes.length + 1;
      const { codigoBarra, qrCode } = generarCodigoVariante({
        sku: nuevoSKU,
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        correlativo,
      });

      return {
        ...variante,
        stockReservado: existentes[0]?.stockReservado || 0,
        codigoBarra: variante.codigoBarra || codigoBarra,
        qrCode: variante.qrCode || qrCode,
      };
    });
  }

  const updatePayload = {
    ...data,
    sku: nuevoSKU,
    ...(Array.isArray(variantesProcesadas) ? { variantes: variantesProcesadas } : {}),
  };

  const productoDespues = await catalogRepository.updateById(id, updatePayload);

  if (!productoDespues) {
    throw new AppError("Producto no encontrado", 404);
  }

  if (Array.isArray(variantesProcesadas)) {
    await cleanupRemovedVariantImages(
      productoAntes.variantes as Variante[],
      productoDespues.variantes as Variante[]
    );
  }

  const defaultWarehouseId = await getDefaultWarehouseId();

  for (const vNueva of productoDespues.variantes) {
    const vAnterior = (productoAntes.variantes as Variante[]).find((v) =>
      matchesVariant(v, vNueva)
    );

    const costoUnitario = Number(
      vNueva.precioCosto !== undefined && vNueva.precioCosto !== null && Number(vNueva.precioCosto) > 0
        ? vNueva.precioCosto
        : productoDespues.precioCosto || 0
    );

    if (!vAnterior && vNueva.stock > 0) {
      const valorTotalOperacion = Number((vNueva.stock * costoUnitario).toFixed(2));
      await recordInventoryMovement({
        producto: productoDespues,
        variante: vNueva,
        tipo: "ENTRADA",
        cantidad: vNueva.stock,
        stockAnterior: 0,
        stockActual: vNueva.stock,
        costoUnitario,
        valorTotalOperacion,
        costoPromedioResultante: costoUnitario,
        saldoValorado: valorTotalOperacion,
        motivo: "Nueva variante en edición de producto",
        referencia: "VARIANTE_NUEVA",
        userId,
        sucursalId: defaultWarehouseId,
      });

      await NivelStock.findOneAndUpdate(
        { sucursalId: defaultWarehouseId, varianteId: vNueva.varianteId },
        {
          $set: { stockFisico: vNueva.stock },
          $setOnInsert: { productoId: productoDespues._id, stockReservado: 0, stockMinimo: 2 },
        },
        { upsert: true }
      );
    }

    if (vAnterior && vNueva.stock > vAnterior.stock) {
      const diff = vNueva.stock - vAnterior.stock;
      const valorTotalOperacion = Number((diff * costoUnitario).toFixed(2));
      const saldoValorado = Number((vNueva.stock * costoUnitario).toFixed(2));

      await recordInventoryMovement({
        producto: productoDespues,
        variante: vNueva,
        tipo: "AJUSTE",
        cantidad: diff,
        stockAnterior: vAnterior.stock,
        stockActual: vNueva.stock,
        costoUnitario,
        valorTotalOperacion,
        costoPromedioResultante: costoUnitario,
        saldoValorado,
        motivo: "Ajuste de inventario en catálogo (aumento)",
        referencia: "AJUSTE_CATALOGO",
        userId,
        sucursalId: defaultWarehouseId,
      });

      await NivelStock.findOneAndUpdate(
        { sucursalId: defaultWarehouseId, varianteId: vNueva.varianteId },
        {
          $inc: { stockFisico: diff },
          $setOnInsert: { productoId: productoDespues._id, stockReservado: 0, stockMinimo: 2 },
        },
        { upsert: true }
      );
    }

    if (vAnterior && vNueva.stock < vAnterior.stock) {
      const diff = vAnterior.stock - vNueva.stock;
      const valorTotalOperacion = Number((diff * costoUnitario).toFixed(2));
      const saldoValorado = Number((vNueva.stock * costoUnitario).toFixed(2));

      await recordInventoryMovement({
        producto: productoDespues,
        variante: vNueva,
        tipo: "AJUSTE",
        cantidad: diff,
        stockAnterior: vAnterior.stock,
        stockActual: vNueva.stock,
        costoUnitario,
        valorTotalOperacion,
        costoPromedioResultante: costoUnitario,
        saldoValorado,
        motivo: "Ajuste de inventario en catálogo (disminución / corrección)",
        referencia: "AJUSTE_CATALOGO",
        userId,
        sucursalId: defaultWarehouseId,
      });

      await NivelStock.findOneAndUpdate(
        { sucursalId: defaultWarehouseId, varianteId: vNueva.varianteId },
        {
          $inc: { stockFisico: -diff },
          $setOnInsert: { productoId: productoDespues._id, stockReservado: 0, stockMinimo: 2 },
        },
        { upsert: true }
      );
    }
  }

  // Comprobar variantes eliminadas que tenían stock para descargar de inventario
  for (const vAnterior of (productoAntes.variantes as Variante[])) {
    const sigueExistiendo = (productoDespues.variantes as Variante[]).some((v) =>
      matchesVariant(v, vAnterior)
    );
    if (!sigueExistiendo && vAnterior.stock > 0) {
      const costoUnitario = Number(
        vAnterior.precioCosto !== undefined && vAnterior.precioCosto !== null && Number(vAnterior.precioCosto) > 0
          ? vAnterior.precioCosto
          : productoDespues.precioCosto || 0
      );
      const valorTotalOperacion = Number((vAnterior.stock * costoUnitario).toFixed(2));

      await recordInventoryMovement({
        producto: productoDespues,
        variante: vAnterior,
        tipo: "AJUSTE",
        cantidad: vAnterior.stock,
        stockAnterior: vAnterior.stock,
        stockActual: 0,
        costoUnitario,
        valorTotalOperacion,
        costoPromedioResultante: costoUnitario,
        saldoValorado: 0,
        motivo: "Variante eliminada en edición de catálogo",
        referencia: "ELIMINACION_VARIANTE",
        userId,
        sucursalId: defaultWarehouseId,
      });

      await NivelStock.findOneAndUpdate(
        { sucursalId: defaultWarehouseId, varianteId: vAnterior.varianteId },
        { $set: { stockFisico: 0 } }
      );
    }
  }

  return productoDespues;
}

export async function deleteCatalogProduct(id: string) {
  await connectDB();
  const producto = await catalogRepository.findById(id);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const hasReservedStock = (producto.variantes as Variante[]).some(
    (variante) => (variante.stockReservado || 0) > 0
  );

  if (hasReservedStock) {
    throw new AppError(
      "No se puede eliminar un producto con stock reservado en pedidos activos",
      409
    );
  }

  await cleanupRemovedVariantImages(producto.variantes as Variante[], []);
  await catalogRepository.deleteById(id);
}

export type PublicCatalogFilters = {
  q?: string;
  categoria?: string;
  color?: string;
  talla?: string;
  soloDisponible?: boolean;
  page?: number;
  limit?: number;
};

export async function getPublicCatalog(filters: PublicCatalogFilters = {}) {
  await connectDB();

  const queryFilter: Record<string, unknown> = {};

  if (filters.categoria?.trim()) {
    const safeCat = filters.categoria.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    queryFilter.categoria = {
      $regex: new RegExp(`^${safeCat}$`, "i"),
    };
  }

  if (filters.q?.trim()) {
    const safeQ = filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeQ, "i");
    queryFilter.$or = [
      { nombre: regex },
      { modelo: regex },
      { sku: regex },
      { descripcion: regex },
      { "variantes.color": regex },
      { "variantes.talla": regex },
    ];
  }

  if (filters.color?.trim()) {
    const safeColor = filters.color.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const colorRegex = new RegExp(safeColor, "i");
    const existingOr = (queryFilter.$or as Record<string, unknown>[]) || [];
    queryFilter.$or = [
      ...existingOr,
      { "variantes.color": colorRegex },
      { "variantes.colorSecundario": colorRegex },
    ];
  }

  if (filters.talla?.trim()) {
    const safeTalla = filters.talla.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    queryFilter["variantes.talla"] = new RegExp(`^${safeTalla}$`, "i");
  }

  const productos = await catalogRepository.listPublic(
    PUBLIC_PRODUCT_PROJECTION,
    queryFilter
  );

  const productIds = productos.map((p) => p._id);
  const webStockMap = await getWebStockMapForProducts(productIds);

  let procesados = productos.map((producto) =>
    withWebVariantAvailability(
      producto.toObject(),
      webStockMap.get(producto._id.toString())
    )
  );

  if (filters.color?.trim() || filters.talla?.trim() || filters.soloDisponible) {
    const colorNorm = filters.color?.trim().toLowerCase();
    const tallaNorm = filters.talla?.trim().toLowerCase();

    procesados = procesados
      .map((producto) => {
        const variantesFiltradas = (producto.variantes || []).filter(
          (v: Record<string, unknown>) => {
            if (colorNorm) {
              const colorVal = typeof v.color === "string" ? v.color.toLowerCase() : "";
              const colorSecVal = typeof v.colorSecundario === "string" ? v.colorSecundario.toLowerCase() : "";
              if (colorVal !== colorNorm && colorSecVal !== colorNorm) {
                return false;
              }
            }

            if (tallaNorm) {
              const tallaVal = typeof v.talla === "string" ? v.talla.toLowerCase() : "";
              if (tallaVal !== tallaNorm) {
                return false;
              }
            }

            if (filters.soloDisponible) {
              const stockDisp = typeof v.stockDisponible === "number" ? v.stockDisponible : 0;
              if (stockDisp <= 0) {
                return false;
              }
            }

            return true;
          }
        );

        return {
          ...producto,
          variantes: variantesFiltradas,
        };
      })
      .filter((producto) => producto.variantes.length > 0);
  }

  const total = procesados.length;
  const isPaged =
    (filters.page !== undefined && filters.page >= 1) ||
    (filters.limit !== undefined && filters.limit >= 1);

  if (isPaged) {
    const page = filters.page && filters.page >= 1 ? filters.page : 1;
    const limit = Math.max(1, Math.min(filters.limit || 20, 100));
    const totalPages = Math.ceil(total / limit) || 1;
    const data = procesados.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  return {
    data: procesados,
    total,
    page: 1,
    limit: total,
    totalPages: 1,
  };
}

export async function getPublicCatalogProductById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID de producto inválido", 400);
  }

  await connectDB();
  const producto = await catalogRepository.findPublicById(id, PUBLIC_PRODUCT_PROJECTION);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const webStockMap = await getWebStockMapForProducts([producto._id]);
  return withWebVariantAvailability(
    producto.toObject(),
    webStockMap.get(producto._id.toString())
  );
}

export async function findCatalogProductByCode(
  code: string,
  isPublicOrClient = true
) {
  if (!code || !code.trim()) {
    throw new AppError("Código no proporcionado", 400);
  }

  await connectDB();
  const cleanCode = code.trim();
  const producto = await catalogRepository.findByVariantCode(cleanCode);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  if (isPublicOrClient && producto.estado === "INACTIVO") {
    throw new AppError("Producto no encontrado", 404);
  }

  let variante = (producto.variantes as Variante[]).find(
    (v: Variante) =>
      v.codigoBarra === cleanCode ||
      v.qrCode === cleanCode ||
      v.varianteId === cleanCode
  );

  // Si no se encontró por código de variante directo, pero el producto coincidió por SKU
  if (!variante && Array.isArray(producto.variantes) && producto.variantes.length > 0) {
    variante =
      (producto.variantes as Variante[]).find(
        (v: Variante) => getVariantAvailableStock(v) > 0
      ) || (producto.variantes as Variante[])[0];
  }

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  const stockDisponible = Math.max(0, getVariantAvailableStock(variante));

  if (!isPublicOrClient && stockDisponible <= 0) {
    throw new AppError("Stock insuficiente", 400);
  }

  const pricing = getVariantPricing(producto, variante);

  if (isPublicOrClient) {
    return {
      _id: producto._id,
      nombre: producto.nombre,
      modelo: producto.modelo,
      sku: producto.sku,
      descripcion: producto.descripcion || "",
      categoria: producto.categoria,
      precioVenta: pricing.precioVenta,
      variante: {
        varianteId: variante.varianteId || "",
        color: variante.color,
        colorSecundario: variante.colorSecundario || null,
        talla: variante.talla,
        stockDisponible,
        precioVenta: pricing.precioVenta,
        medidas: variante.medidas || {},
        imagen: getVarianteImagenPrincipal(variante) || null,
        imagenes: getVarianteImagenes(variante) || [],
        codigoBarra: variante.codigoBarra || null,
        qrCode: variante.qrCode || null,
      },
    };
  }

  return {
    _id: producto._id,
    nombre: producto.nombre,
    modelo: producto.modelo,
    sku: producto.sku,
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    precioVenta: pricing.precioVenta,
    variante: {
      varianteId: variante.varianteId || "",
      color: variante.color,
      colorSecundario: variante.colorSecundario,
      talla: variante.talla,
      stock: variante.stock,
      stockReservado: variante.stockReservado || 0,
      stockDisponible,
      precioVenta: pricing.precioVenta,
      precioCosto: pricing.precioCosto,
      medidas: variante.medidas,
      imagen: getVarianteImagenPrincipal(variante),
      imagenes: getVarianteImagenes(variante),
      codigoBarra: variante.codigoBarra,
      qrCode: variante.qrCode,
    },
  };
}
