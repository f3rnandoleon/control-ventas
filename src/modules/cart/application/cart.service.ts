import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import Producto from "@/models/product";
import type { Variante } from "@/types/producto";
import type {
  AddCartItemInput,
  UpdateCartItemInput,
} from "@/schemas/cart.schema";
import { getVarianteImagenPrincipal } from "@/utils/varianteImagen";
import { findVariantByIdentity } from "@/utils/variantIdentity";
import { AppError } from "@/shared/errors/AppError";
import { cartRepository } from "@/modules/cart/infrastructure/cart.repository";
import { getAvailableStockForVariant } from "@/modules/inventory/application/inventory.service";

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

function recalculateCart(cart: {
  items: Array<{ cantidad: number; subtotal: number }>;
  totalItems: number;
  subtotal: number;
}) {
  cart.totalItems = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
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
    variantId: input.variantId,
    color: input.color,
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
      item.variante.talla === variante.talla &&
      (item.variante.variantId || "") === (variante.variantId || "")
  );

  const nextQuantity = (existingItem?.cantidad || 0) + input.cantidad;

  if (getAvailableStockForVariant(variante) < nextQuantity) {
    throw new AppError("Stock insuficiente para agregar al carrito", 400);
  }

  if (existingItem) {
    existingItem.cantidad = nextQuantity;
    existingItem.precioUnitario = producto.precioVenta;
    existingItem.subtotal = nextQuantity * producto.precioVenta;
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
        variantId: variante.variantId,
        color: variante.color,
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
      precioUnitario: producto.precioVenta,
      cantidad: input.cantidad,
      subtotal: input.cantidad * producto.precioVenta,
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
    variantId: item.variante.variantId,
    color: item.variante.color,
    talla: item.variante.talla,
  });

  if (!variante) {
    throw new AppError("Variante no encontrada", 404);
  }

  if (getAvailableStockForVariant(variante) < input.cantidad) {
    throw new AppError("Stock insuficiente para actualizar el carrito", 400);
  }

  item.cantidad = input.cantidad;
  item.precioUnitario = producto.precioVenta;
  item.subtotal = input.cantidad * producto.precioVenta;
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
      variantId: item.variante.variantId,
      color: item.variante.color,
      talla: item.variante.talla,
    });

    if (!variante) {
      throw new AppError("Una variante del carrito ya no existe", 404);
    }

    if (getAvailableStockForVariant(variante) < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para ${producto.nombre} ${variante.color}/${variante.talla}`,
        400
      );
    }

    validatedItems.push({
      producto,
      variante,
      cartItem: item,
      precioUnitario: producto.precioVenta,
      subtotal: producto.precioVenta * item.cantidad,
    });
  }

  return { cart, validatedItems };
}
