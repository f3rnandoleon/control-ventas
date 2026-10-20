import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/producto";
import type { Variante } from "@/types/producto";
import type {
  AddCartItemInput,
  UpdateCartItemInput,
} from "@/schemas/cart.schema";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { findVariantByIdentity } from "@/utils/varianteIdentity";
import { AppError } from "@/shared/errors/AppError";
import { cartRepository } from "@/modules/cart/infrastructure/cart.repository";
import { getAvailableWebStockForVariant } from "@/modules/inventory/application/branch-stock.service";
import { getVariantPricing } from "@/utils/pricing";


function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function recalculateCart(cart: {
  items: Array<{ cantidad: number; subtotal: number }>;
  totalArticulos: number;
  subtotal: number;
}) {
  cart.totalArticulos = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
}

async function getProductAndVariant(
  input: AddCartItemInput,
  session?: ClientSession
) {
  const producto = await Producto.findById(input.productoId).session(
    session ?? null
  );

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const variante = findVariantByIdentity(producto.variantes as Variante[], {
    varianteId: input.varianteId,
    color: input.color,
    colorSecundario: input.colorSecundario,
    talla: input.talla,
  });

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  return { producto, variante };
}

export async function getCartByUserId(
  userIdRaw: string,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  await connectDB();
  return cartRepository.upsertEmptyCart(userId, session);
}

export async function addCartItemByUserId(
  userIdRaw: string,
  input: AddCartItemInput,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  assertObjectId(input.productoId, "Producto invalido");
  await connectDB();

  const cart = await cartRepository.upsertEmptyCart(userId, session);
  const { producto, variante } = await getProductAndVariant(input, session);

  const existingItem = cart.items.find(
    (item: (typeof cart.items)[number]) =>
      item.productoId.toString() === input.productoId &&
      item.variante.color === variante.color &&
      (item.variante.colorSecundario || "") ===
        (variante.colorSecundario || "") &&
      item.variante.talla === variante.talla &&
      (item.variante.varianteId || "") === (variante.varianteId || "")
  );

  const nextQuantity = (existingItem?.cantidad || 0) + input.cantidad;

  const stockDisponibleWeb = await getAvailableWebStockForVariant(producto._id, variante.varianteId || "", session);
  if (stockDisponibleWeb < nextQuantity) {
    throw new AppError("Stock insuficiente en tienda online para la cantidad solicitada", 400);
  }

  const pricing = getVariantPricing(producto, variante);
  const precioUnitario = pricing.precioVenta;

  if (existingItem) {
    existingItem.cantidad = nextQuantity;
    existingItem.precioUnitario = precioUnitario;
    existingItem.subtotal = nextQuantity * precioUnitario;
    existingItem.productoSnapshot = {
      nombre: producto.nombre,
      modelo: producto.modelo,
      sku: producto.sku,
      imagen: getVarianteImagenPrincipal(variante),
    };
  } else {
    cart.items.push({
      productoId: producto._id,
      variante: {
        varianteId: variante.varianteId,
        color: variante.color,
        colorSecundario: variante.colorSecundario,
        talla: variante.talla,
        codigoBarra: variante.codigoBarra,
        qrCode: variante.qrCode,
      },
      productoSnapshot: {
        nombre: producto.nombre,
        modelo: producto.modelo,
        sku: producto.sku,
        imagen: getVarianteImagenPrincipal(variante),
      },
      precioUnitario,
      cantidad: input.cantidad,
      subtotal: input.cantidad * precioUnitario,
    });
  }

  recalculateCart(cart);
  await cart.save(session ? { session } : undefined);
  return cart;
}

export async function updateCartItemByUserId(
  userIdRaw: string,
  itemId: string,
  input: UpdateCartItemInput,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  assertObjectId(itemId, "Item de carrito invalido");
  await connectDB();

  const cart = await cartRepository.upsertEmptyCart(userId, session);
  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError("Item de carrito no encontrado", 404);
  }

  const producto = await Producto.findById(item.productoId).session(
    session ?? null
  );

  if (!producto) {
    throw new AppError("Producto no encontrado", 404);
  }

  const variante = findVariantByIdentity(producto.variantes as Variante[], {
    varianteId: item.variante.varianteId,
    color: item.variante.color,
    colorSecundario: item.variante.colorSecundario,
    talla: item.variante.talla,
  });

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  const stockDisponibleWeb = await getAvailableWebStockForVariant(producto._id, variante.varianteId || "", session);
  if (stockDisponibleWeb < input.cantidad) {
    throw new AppError("Stock insuficiente en tienda online para actualizar el carrito", 400);
  }

  const pricing = getVariantPricing(producto, variante);
  const precioUnitario = pricing.precioVenta;

  item.cantidad = input.cantidad;
  item.precioUnitario = precioUnitario;
  item.subtotal = input.cantidad * precioUnitario;
  item.productoSnapshot = {
    nombre: producto.nombre,
    modelo: producto.modelo,
    sku: producto.sku,
    imagen: getVarianteImagenPrincipal(variante),
  };

  recalculateCart(cart);
  await cart.save(session ? { session } : undefined);
  return cart;
}

export async function removeCartItemByUserId(
  userIdRaw: string,
  itemId: string,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  assertObjectId(itemId, "Item de carrito invalido");
  await connectDB();

  const cart = await cartRepository.upsertEmptyCart(userId, session);
  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError("Item de carrito no encontrado", 404);
  }

  item.deleteOne();
  recalculateCart(cart);
  await cart.save(session ? { session } : undefined);
  return cart;
}

export async function clearCartByUserId(
  userIdRaw: string,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  await connectDB();

  const cart = await cartRepository.upsertEmptyCart(userId, session);
  cart.items = [];
  recalculateCart(cart);
  await cart.save(session ? { session } : undefined);
  return cart;
}

export async function getValidatedCartForCheckout(
  userIdRaw: string,
  session?: ClientSession
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");
  await connectDB();

  const cart = await cartRepository.upsertEmptyCart(userId, session);

  if (cart.items.length === 0) {
    throw new AppError("El carrito esta vacio", 400);
  }

  const validatedItems = [];

  for (const item of cart.items) {
    const producto = await Producto.findById(item.productoId).session(
      session ?? null
    );

    if (!producto) {
      throw new AppError("Uno de los productos del carrito ya no existe", 404);
    }

    const variante = findVariantByIdentity(producto.variantes as Variante[], {
      varianteId: item.variante.varianteId,
      color: item.variante.color,
      colorSecundario: item.variante.colorSecundario,
      talla: item.variante.talla,
    });

    if (!variante) {
      throw new AppError("Una variante del carrito ya no existe", 404);
    }

    const stockDisponibleWeb = await getAvailableWebStockForVariant(producto._id, variante.varianteId || "", session);
    if (stockDisponibleWeb < item.cantidad) {
      throw new AppError(
        `Stock insuficiente en tienda online para ${producto.nombre} ${variante.color}/${variante.talla}`,
        400
      );
    }

    const pricing = getVariantPricing(producto, variante);
    const precioUnitario = pricing.precioVenta;

    validatedItems.push({
      producto,
      variante,
      cartItem: item,
      precioUnitario,
      subtotal: precioUnitario * item.cantidad,
    });
  }

  return { cart, validatedItems };
}
