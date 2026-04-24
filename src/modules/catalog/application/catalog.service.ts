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
} from "@/modules/catalog/domain/variant.utils";
import { recordInventoryMovement } from "@/modules/inventory/application/inventory.service";
import type { Variante, Producto } from "@/types/producto";

type ProductoPayload = Partial<Producto> & {
  variantes?: Variante[];
};

type CatalogVariantLike = Record<string, unknown> & {
  stock?: number | null;
  stockReservado?: number | null;
};

type CatalogProductLike = Record<string, unknown> & {
  variantes?: CatalogVariantLike[];
  stockTotal?: number;
  stockMinimo?: number;
};

export async function listCatalog(withStock: boolean) {
  await connectDB();
  const productos = await catalogRepository.listAll();

  if (!withStock) {
    return productos.map((producto) =>
      withVariantAvailability(producto as CatalogProductLike)
    );
  }

  return productos.map((producto) =>
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

  return catalogRepository.create({
    ...data,
    sku,
    creadoPor: userId,
    variantes: variantesProcesadas,
  });
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

  for (const vNueva of productoDespues.variantes) {
    const vAnterior = (productoAntes.variantes as Variante[]).find((v) =>
      matchesVariant(v, vNueva)
    );

    if (!vAnterior && vNueva.stock > 0) {
      await recordInventoryMovement({
        producto: productoDespues,
        variante: vNueva,
        tipo: "ENTRADA",
        cantidad: vNueva.stock,
        stockAnterior: 0,
        stockActual: vNueva.stock,
        motivo: "Nueva variante",
        referencia: "VARIANTE_NUEVA",
        userId,
      });
    }

    if (vAnterior && vNueva.stock > vAnterior.stock) {
      const diff = vNueva.stock - vAnterior.stock;

      await recordInventoryMovement({
        producto: productoDespues,
        variante: vNueva,
        tipo: "ENTRADA",
        cantidad: diff,
        stockAnterior: vAnterior.stock,
        stockActual: vNueva.stock,
        motivo: "Aumento de stock",
        referencia: "ACTUALIZACION_VARIANTE",
        userId,
      });
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

export async function getPublicCatalog() {
  await connectDB();
  const productos = await catalogRepository.listPublic(PUBLIC_PRODUCT_PROJECTION);
  return productos.map((producto) => withVariantAvailability(producto.toObject()));
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

  return withVariantAvailability(producto.toObject());
}

export async function findCatalogProductByCode(code: string) {
  if (!code) {
    throw new AppError("Código no proporcionado", 400);
  }

  await connectDB();
  const producto = await catalogRepository.findByVariantCode(code);

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const variante = producto.variantes.find(
    (v: Variante) => v.codigoBarra === code || v.qrCode === code
  );

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  const stockDisponible = getVariantAvailableStock(variante);

  if (stockDisponible <= 0) {
    throw new AppError("Stock insuficiente", 400);
  }

  return {
    _id: producto._id,
    nombre: producto.nombre,
    modelo: producto.modelo,
    precioVenta: producto.precioVenta,
    variante: {
      varianteId: variante.varianteId,
      color: variante.color,
      colorSecundario: variante.colorSecundario,
      talla: variante.talla,
      stock: variante.stock,
      stockReservado: variante.stockReservado || 0,
      stockDisponible,
      imagen: getVarianteImagenPrincipal(variante),
      imagenes: getVarianteImagenes(variante),
      codigoBarra: variante.codigoBarra,
      qrCode: variante.qrCode,
    },
  };
}
