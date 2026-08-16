"use client";

import type { Producto, Variante } from "@/types/producto";
import { getStockDisponibleVariante } from "@/utils/stock";
import { getVarianteSegundaImagen } from "@/utils/varianteImagen";

type VarianteDisponible = {
  variante: Variante;
  imagen: string;
  stockDisponible: number;
};

const CARD_WIDTH = 260;
const CARD_HEIGHT = 390;
const GAP = 24;
const PADDING = 32;
const HEADER_HEIGHT = 110;
const IMAGE_HEIGHT = 325;

type GenerarImagenVariantesOptions = {
  tallas?: string[];
};

type GenerarImagenGeneralOptions = {
  productoIds?: string[];
  tallas?: string[];
};

type VarianteGeneralDisponible = VarianteDisponible & {
  producto: Producto;
};

type GeneralSection =
  | { kind: "product"; text: string }
  | { kind: "size"; text: string }
  | { kind: "model"; text: string }
  | { kind: "cards"; items: VarianteGeneralDisponible[] };

function slugifyFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((currentLine, index) => {
    const displayLine =
      index === maxLines - 1 && lines.length > maxLines
        ? `${currentLine.replace(/\s+\S*$/, "")}...`
        : currentLine;
    ctx.fillText(displayLine, x, y + index * lineHeight);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function drawVariantCard(
  ctx: CanvasRenderingContext2D,
  item: VarianteDisponible,
  image: HTMLImageElement | null,
  x: number,
  y: number
) {
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, 8);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawRoundedRect(ctx, x, y, CARD_WIDTH, IMAGE_HEIGHT, 8);
  ctx.save();
  ctx.clip();
  if (image) {
    drawCoverImage(ctx, image, x, y, CARD_WIDTH, IMAGE_HEIGHT);
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x, y, CARD_WIDTH, IMAGE_HEIGHT);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 16px Arial, sans-serif";
    ctx.fillText("Imagen no disponible", x + 42, y + IMAGE_HEIGHT / 2);
  }
  ctx.restore();

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 18px Arial, sans-serif";
  const colorLabel = item.variante.colorSecundario
    ? `${item.variante.color} con ${item.variante.colorSecundario}`
    : item.variante.color;
  wrapText(ctx, colorLabel, x + 16, y + 352, CARD_WIDTH - 32, 22, 1);
  ctx.fillStyle = "#475569";
  ctx.font = "400 14px Arial, sans-serif";
  ctx.fillText(`Talla: ${item.variante.talla}`, x + 16, y + 374);
  ctx.fillStyle = "#0369a1";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.fillText(`Disponible: ${item.stockDisponible}`, x + 136, y + 374);
}

export async function generarImagenVariantesDisponibles(
  producto: Producto,
  options: GenerarImagenVariantesOptions = {}
) {
  const tallasSeleccionadas = new Set(options.tallas?.map((talla) => talla.trim()));
  const variantes = producto.variantes
    .map((variante): VarianteDisponible | null => {
      const imagen = getVarianteSegundaImagen(variante);
      const stockDisponible = getStockDisponibleVariante(variante);
      if (tallasSeleccionadas.size > 0 && !tallasSeleccionadas.has(variante.talla.trim())) return null;
      if (!imagen || stockDisponible <= 0) return null;
      return { variante, imagen, stockDisponible };
    })
    .filter((value): value is VarianteDisponible => Boolean(value));

  if (variantes.length === 0) {
    throw new Error("No hay variantes disponibles con segunda imagen");
  }

  const columns = Math.min(3, variantes.length);
  const rows = Math.ceil(variantes.length / columns);
  const width = PADDING * 2 + columns * CARD_WIDTH + (columns - 1) * GAP;
  const height = PADDING * 2 + HEADER_HEIGHT + rows * CARD_HEIGHT + (rows - 1) * GAP;
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.scale(ratio, ratio);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial, sans-serif";
  wrapText(ctx, producto.nombre, PADDING, 46, width - PADDING * 2, 38, 1);
  ctx.font = "400 18px Arial, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`Modelo: ${producto.modelo || "Sin modelo"}`, PADDING, 82);

  const loadedImages = await Promise.all(
    variantes.map(async (item) => {
      try {
        return await loadImage(item.imagen);
      } catch {
        return null;
      }
    })
  );

  variantes.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PADDING + col * (CARD_WIDTH + GAP);
    const y = PADDING + HEADER_HEIGHT + row * (CARD_HEIGHT + GAP);
    const image = loadedImages[index];

    drawVariantCard(ctx, item, image, x, y);
  });

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `variantes-${slugifyFilename(producto.sku || producto.nombre || producto._id)}.png`;
  link.click();
}

export async function generarImagenGeneralVariantesDisponibles(
  productos: Producto[],
  options: GenerarImagenGeneralOptions = {}
) {
  const productosSeleccionados = new Set(options.productoIds);
  const tallasSeleccionadas = new Set(options.tallas?.map((talla) => talla.trim()));
  const variantes: VarianteGeneralDisponible[] = [];

  productos.forEach((producto) => {
    if (productosSeleccionados.size > 0 && !productosSeleccionados.has(producto._id)) return;
    producto.variantes.forEach((variante) => {
      const imagen = getVarianteSegundaImagen(variante);
      const stockDisponible = getStockDisponibleVariante(variante);
      if (tallasSeleccionadas.size > 0 && !tallasSeleccionadas.has(variante.talla.trim())) return;
      if (!imagen || stockDisponible <= 0) return;
      variantes.push({ producto, variante, imagen, stockDisponible });
    });
  });

  if (variantes.length === 0) {
    throw new Error("No hay variantes disponibles con segunda imagen para la seleccion");
  }

  const columns = 4;
  const width = PADDING * 2 + columns * CARD_WIDTH + (columns - 1) * GAP;
  const productNames = [...new Set(variantes.map((item) => item.producto.nombre))]
    .sort((a, b) => a.localeCompare(b, "es"));
  const sections: GeneralSection[] = [];

  productNames.forEach((productName) => {
    const byProduct = variantes.filter((item) => item.producto.nombre === productName);
    sections.push({ kind: "product", text: productName });
    const tallas = [...new Set(byProduct.map((item) => item.variante.talla.trim()))]
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    tallas.forEach((talla) => {
      const byTalla = byProduct.filter((item) => item.variante.talla.trim() === talla);
      sections.push({ kind: "size", text: `Talla ${talla}` });
      const modelos = [...new Set(byTalla.map((item) => item.producto.modelo || "Sin modelo"))]
        .sort((a, b) => a.localeCompare(b, "es"));
      modelos.forEach((modelo) => {
        const byModelo = byTalla.filter((item) => (item.producto.modelo || "Sin modelo") === modelo);
        sections.push({ kind: "model", text: modelo });
        sections.push({ kind: "cards", items: byModelo });
      });
    });
  });

  const height = sections.reduce((total, section) => {
    if (section.kind === "product") return total + 58;
    if (section.kind === "size") return total + 46;
    if (section.kind === "model") return total + 36;
    return total + Math.ceil(section.items.length / columns) * CARD_HEIGHT + (Math.ceil(section.items.length / columns) - 1) * GAP + 30;
  }, PADDING * 2 + 86);

  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Arial, sans-serif";
  ctx.fillText("Variantes disponibles", PADDING, 50);
  ctx.font = "400 18px Arial, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`${productosSeleccionados.size || productos.length} productos - ${tallasSeleccionadas.size || "todas"} tallas`, PADDING, 80);

  const loadedImages = await Promise.all(
    variantes.map(async (item) => {
      try {
        return await loadImage(item.imagen);
      } catch {
        return null;
      }
    })
  );
  const imageByVariant = new Map<VarianteGeneralDisponible, HTMLImageElement | null>();
  variantes.forEach((item, index) => imageByVariant.set(item, loadedImages[index]));

  let y = PADDING + 90;
  sections.forEach((section) => {
    if (section.kind === "product") {
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 30px Arial, sans-serif";
      ctx.fillText(section.text, PADDING, y + 34);
      y += 58;
      return;
    }
    if (section.kind === "size") {
      ctx.fillStyle = "#0369a1";
      ctx.font = "700 24px Arial, sans-serif";
      ctx.fillText(section.text, PADDING, y + 26);
      y += 46;
      return;
    }
    if (section.kind === "model") {
      ctx.fillStyle = "#334155";
      ctx.font = "700 20px Arial, sans-serif";
      ctx.fillText(`Modelo ${section.text}`, PADDING, y + 22);
      y += 36;
      return;
    }

    section.items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = PADDING + col * (CARD_WIDTH + GAP);
      const cardY = y + row * (CARD_HEIGHT + GAP);
      drawVariantCard(ctx, item, imageByVariant.get(item) ?? null, x, cardY);
    });
    y += Math.ceil(section.items.length / columns) * CARD_HEIGHT + (Math.ceil(section.items.length / columns) - 1) * GAP + 30;
  });

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "variantes-disponibles-general.png";
  link.click();
}
