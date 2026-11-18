"use client";

import { TALLA_OPTIONS } from "@/constants/variant-options";
import type { Producto, Variante } from "@/types/producto";
import { getStockDisponibleVariante } from "@/utils/stock";
import { getVarianteSegundaImagen } from "@/utils/varianteImagen";

type VarianteDisponible = {
  variante: Variante;
  imagen: string;
  stockDisponible: number;
};

export type VarianteAgrupadaDisponible = {
  producto: Producto;
  color: string;
  colorSecundario?: string;
  imagen: string;
  tallas: Array<{
    talla: string;
    stockDisponible: number;
  }>;
};

const CARD_WIDTH = 260;
const CARD_HEIGHT = 390;
const GROUPED_CARD_HEIGHT = 420;
const GAP = 24;
const PADDING = 32;
const HEADER_HEIGHT = 110;
const IMAGE_HEIGHT = 325;

const TALLA_ORDER = new Map<string, number>(
  TALLA_OPTIONS.map((talla, index) => [talla.toUpperCase(), index])
);

export type GenerarImagenVariantesOptions = {
  tallas?: string[];
  agruparVariantesIguales?: boolean;
};

export type GenerarImagenGeneralOptions = {
  productoIds?: string[];
  tallas?: string[];
  agruparVariantesIguales?: boolean;
};

type VarianteGeneralDisponible = VarianteDisponible & {
  producto: Producto;
};

type GeneralSection =
  | { kind: "product"; text: string }
  | { kind: "size"; text: string }
  | { kind: "model"; text: string }
  | { kind: "cards"; items: VarianteGeneralDisponible[] }
  | { kind: "groupedCards"; items: VarianteAgrupadaDisponible[] };

export function compareTallas(a: string, b: string) {
  const indexA = TALLA_ORDER.get(a.trim().toUpperCase());
  const indexB = TALLA_ORDER.get(b.trim().toUpperCase());
  if (indexA !== undefined && indexB !== undefined) {
    return indexA - indexB;
  }
  if (indexA !== undefined) return -1;
  if (indexB !== undefined) return 1;
  return a.localeCompare(b, "es", { numeric: true });
}

function formatColorLabel(color: string, colorSecundario?: string) {
  return colorSecundario ? `${color} con ${colorSecundario}` : color;
}

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

async function loadImages(sources: string[]) {
  return Promise.all(
    sources.map(async (src) => {
      try {
        return await loadImage(src);
      } catch {
        return null;
      }
    })
  );
}

function createCanvasContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.scale(ratio, ratio);

  return { canvas, ctx };
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
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

function drawCardFrameAndImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  cardHeight: number
) {
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, x, y, CARD_WIDTH, cardHeight, 8);
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
}

function drawVariantCard(
  ctx: CanvasRenderingContext2D,
  item: VarianteDisponible,
  image: HTMLImageElement | null,
  x: number,
  y: number
) {
  drawCardFrameAndImage(ctx, image, x, y, CARD_HEIGHT);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 18px Arial, sans-serif";
  wrapText(
    ctx,
    formatColorLabel(item.variante.color, item.variante.colorSecundario),
    x + 16,
    y + 352,
    CARD_WIDTH - 32,
    22,
    1
  );
  ctx.fillStyle = "#475569";
  ctx.font = "400 14px Arial, sans-serif";
  ctx.fillText(`Talla: ${item.variante.talla}`, x + 16, y + 374);
  ctx.fillStyle = "#0369a1";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.fillText(`Disponible: ${item.stockDisponible}`, x + 136, y + 374);
}

function drawGroupedVariantCard(
  ctx: CanvasRenderingContext2D,
  item: VarianteAgrupadaDisponible,
  image: HTMLImageElement | null,
  x: number,
  y: number
) {
  drawCardFrameAndImage(ctx, image, x, y, GROUPED_CARD_HEIGHT);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 18px Arial, sans-serif";
  wrapText(
    ctx,
    formatColorLabel(item.color, item.colorSecundario),
    x + 16,
    y + 350,
    CARD_WIDTH - 32,
    22,
    1
  );

  const tallasTexto = item.tallas
    .map(({ talla, stockDisponible }) => `${talla}\u00A0(${stockDisponible})`)
    .join(", ");

  ctx.fillStyle = "#0369a1";
  ctx.font = "600 13px Arial, sans-serif";
  wrapText(
    ctx,
    `Tallas: ${tallasTexto}`,
    x + 16,
    y + 374,
    CARD_WIDTH - 32,
    17,
    3
  );
}

export function getVariantesIgualesDisponibles(
  productos: Producto[],
  options: Pick<GenerarImagenGeneralOptions, "productoIds" | "tallas"> = {}
): VarianteAgrupadaDisponible[] {
  const productosSeleccionados = new Set(options.productoIds);
  const tallasSeleccionadas = [
    ...new Set(
      (options.tallas ?? []).map((talla) => talla.trim()).filter(Boolean)
    ),
  ];
  const tallasSet = new Set(tallasSeleccionadas);

  type GroupAccumulator = {
    producto: Producto;
    color: string;
    colorSecundario?: string;
    imagen: string;
    tallasMap: Map<string, number>;
  };

  const groups = new Map<string, GroupAccumulator>();

  productos.forEach((producto) => {
    if (productosSeleccionados.size > 0 && !productosSeleccionados.has(producto._id)) {
      return;
    }

    const nombreKey = (producto.nombre || "").trim().toLowerCase();
    const modeloKey = (producto.modelo || "Sin modelo").trim().toLowerCase();

    producto.variantes.forEach((variante) => {
      const imagen = getVarianteSegundaImagen(variante);
      const stockDisponible = getStockDisponibleVariante(variante);
      const talla = variante.talla.trim();

      if (!imagen || stockDisponible <= 0 || !talla) return;
      if (tallasSet.size > 0 && !tallasSet.has(talla)) return;

      const color = variante.color.trim();
      const colorSecundario = variante.colorSecundario?.trim() || undefined;
      const key = `${nombreKey}::${modeloKey}::${color.toLowerCase()}::${(colorSecundario || "").toLowerCase()}`;

      const current = groups.get(key) ?? {
        producto,
        color,
        colorSecundario,
        imagen,
        tallasMap: new Map<string, number>(),
      };

      current.tallasMap.set(
        talla,
        (current.tallasMap.get(talla) ?? 0) + stockDisponible
      );
      groups.set(key, current);
    });
  });

  const result: VarianteAgrupadaDisponible[] = [];

  groups.forEach((group) => {
    if (
      tallasSeleccionadas.length > 0 &&
      !tallasSeleccionadas.every((talla) => group.tallasMap.has(talla))
    ) {
      return;
    }

    const tallas = [...group.tallasMap.entries()]
      .sort(([tallaA], [tallaB]) => compareTallas(tallaA, tallaB))
      .map(([talla, stockDisponible]) => ({ talla, stockDisponible }));

    result.push({
      producto: group.producto,
      color: group.color,
      colorSecundario: group.colorSecundario,
      imagen: group.imagen,
      tallas,
    });
  });

  return result.sort((a, b) =>
    formatColorLabel(a.color, a.colorSecundario).localeCompare(
      formatColorLabel(b.color, b.colorSecundario),
      "es"
    )
  );
}

export async function generarImagenVariantesDisponibles(
  producto: Producto,
  options: GenerarImagenVariantesOptions = {}
) {
  const tallasSeleccionadas = new Set(
    options.tallas?.map((talla) => talla.trim()).filter(Boolean)
  );

  if (options.agruparVariantesIguales) {
    const grupos = getVariantesIgualesDisponibles([producto], {
      tallas: [...tallasSeleccionadas],
    });

    if (grupos.length === 0) {
      throw new Error(
        "No hay colores con todas las tallas seleccionadas disponibles y segunda imagen"
      );
    }

    const columns = Math.min(3, grupos.length);
    const rows = Math.ceil(grupos.length / columns);
    const width = PADDING * 2 + columns * CARD_WIDTH + (columns - 1) * GAP;
    const height =
      PADDING * 2 + HEADER_HEIGHT + rows * GROUPED_CARD_HEIGHT + (rows - 1) * GAP;
    const { canvas, ctx } = createCanvasContext(width, height);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 34px Arial, sans-serif";
    wrapText(ctx, producto.nombre, PADDING, 46, width - PADDING * 2, 38, 1);
    ctx.font = "400 18px Arial, sans-serif";
    ctx.fillStyle = "#475569";
    const sortedTallas = [...tallasSeleccionadas].sort(compareTallas);
    const subtitle =
      sortedTallas.length > 0
        ? `Modelo: ${producto.modelo || "Sin modelo"} • Tallas: ${sortedTallas.join(", ")}`
        : `Modelo: ${producto.modelo || "Sin modelo"}`;
    wrapText(ctx, subtitle, PADDING, 82, width - PADDING * 2, 22, 1);

    const loadedImages = await loadImages(grupos.map((item) => item.imagen));

    grupos.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = PADDING + col * (CARD_WIDTH + GAP);
      const y = PADDING + HEADER_HEIGHT + row * (GROUPED_CARD_HEIGHT + GAP);
      drawGroupedVariantCard(ctx, item, loadedImages[index], x, y);
    });

    downloadCanvas(
      canvas,
      `variantes-iguales-${slugifyFilename(producto.sku || producto.nombre || producto._id)}.png`
    );
    return;
  }

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
  const { canvas, ctx } = createCanvasContext(width, height);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Arial, sans-serif";
  wrapText(ctx, producto.nombre, PADDING, 46, width - PADDING * 2, 38, 1);
  ctx.font = "400 18px Arial, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`Modelo: ${producto.modelo || "Sin modelo"}`, PADDING, 82);

  const loadedImages = await loadImages(variantes.map((item) => item.imagen));

  variantes.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PADDING + col * (CARD_WIDTH + GAP);
    const y = PADDING + HEADER_HEIGHT + row * (CARD_HEIGHT + GAP);
    drawVariantCard(ctx, item, loadedImages[index], x, y);
  });

  downloadCanvas(
    canvas,
    `variantes-${slugifyFilename(producto.sku || producto.nombre || producto._id)}.png`
  );
}

export async function generarImagenGeneralVariantesDisponibles(
  productos: Producto[],
  options: GenerarImagenGeneralOptions = {}
) {
  const productosSeleccionados = new Set(options.productoIds);
  const tallasSeleccionadas = new Set(
    options.tallas?.map((talla) => talla.trim()).filter(Boolean)
  );
  const columns = 4;
  const width = PADDING * 2 + columns * CARD_WIDTH + (columns - 1) * GAP;

  if (options.agruparVariantesIguales) {
    const grupos = getVariantesIgualesDisponibles(productos, {
      productoIds: options.productoIds,
      tallas: [...tallasSeleccionadas],
    });

    if (grupos.length === 0) {
      throw new Error(
        "No hay variantes con todas las tallas seleccionadas disponibles y segunda imagen"
      );
    }

    const productNames = [...new Set(grupos.map((item) => item.producto.nombre))]
      .sort((a, b) => a.localeCompare(b, "es"));
    const sections: GeneralSection[] = [];

    productNames.forEach((productName) => {
      const byProduct = grupos.filter((item) => item.producto.nombre === productName);
      sections.push({ kind: "product", text: productName });
      const modelos = [...new Set(byProduct.map((item) => item.producto.modelo || "Sin modelo"))]
        .sort((a, b) => a.localeCompare(b, "es"));
      modelos.forEach((modelo) => {
        const byModelo = byProduct.filter(
          (item) => (item.producto.modelo || "Sin modelo") === modelo
        );
        sections.push({ kind: "model", text: modelo });
        sections.push({ kind: "groupedCards", items: byModelo });
      });
    });

    const height = sections.reduce((total, section) => {
      if (section.kind === "product") return total + 58;
      if (section.kind === "model") return total + 36;
      if (section.kind === "groupedCards") {
        const rows = Math.ceil(section.items.length / columns);
        return total + rows * GROUPED_CARD_HEIGHT + (rows - 1) * GAP + 30;
      }
      return total;
    }, PADDING * 2 + 86);

    const { canvas, ctx } = createCanvasContext(width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 36px Arial, sans-serif";
    ctx.fillText("Variantes iguales disponibles", PADDING, 50);
    ctx.font = "400 18px Arial, sans-serif";
    ctx.fillStyle = "#475569";
    const sortedTallas = [...tallasSeleccionadas].sort(compareTallas);
    const subtitle =
      sortedTallas.length > 0
        ? `${productNames.length} productos - Tallas: ${sortedTallas.join(", ")}`
        : `${productNames.length} productos - todas las tallas`;
    wrapText(ctx, subtitle, PADDING, 80, width - PADDING * 2, 22, 1);

    const loadedImages = await loadImages(grupos.map((item) => item.imagen));
    const imageByGroup = new Map<VarianteAgrupadaDisponible, HTMLImageElement | null>();
    grupos.forEach((item, index) => imageByGroup.set(item, loadedImages[index]));

    let y = PADDING + 90;
    sections.forEach((section) => {
      if (section.kind === "product") {
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 30px Arial, sans-serif";
        ctx.fillText(section.text, PADDING, y + 34);
        y += 58;
        return;
      }
      if (section.kind === "model") {
        ctx.fillStyle = "#334155";
        ctx.font = "700 20px Arial, sans-serif";
        ctx.fillText(`Modelo ${section.text}`, PADDING, y + 22);
        y += 36;
        return;
      }
      if (section.kind !== "groupedCards") return;

      section.items.forEach((item, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = PADDING + col * (CARD_WIDTH + GAP);
        const cardY = y + row * (GROUPED_CARD_HEIGHT + GAP);
        drawGroupedVariantCard(ctx, item, imageByGroup.get(item) ?? null, x, cardY);
      });
      const rows = Math.ceil(section.items.length / columns);
      y += rows * GROUPED_CARD_HEIGHT + (rows - 1) * GAP + 30;
    });

    downloadCanvas(canvas, "variantes-iguales-general.png");
    return;
  }

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

  const productNames = [...new Set(variantes.map((item) => item.producto.nombre))]
    .sort((a, b) => a.localeCompare(b, "es"));
  const sections: GeneralSection[] = [];

  productNames.forEach((productName) => {
    const byProduct = variantes.filter((item) => item.producto.nombre === productName);
    sections.push({ kind: "product", text: productName });
    const tallas = [...new Set(byProduct.map((item) => item.variante.talla.trim()))]
      .sort(compareTallas);
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
    if (section.kind === "cards") {
      const rows = Math.ceil(section.items.length / columns);
      return total + rows * CARD_HEIGHT + (rows - 1) * GAP + 30;
    }
    return total;
  }, PADDING * 2 + 86);

  const { canvas, ctx } = createCanvasContext(width, height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Arial, sans-serif";
  ctx.fillText("Variantes disponibles", PADDING, 50);
  ctx.font = "400 18px Arial, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText(`${productosSeleccionados.size || productos.length} productos - ${tallasSeleccionadas.size || "todas"} tallas`, PADDING, 80);

  const loadedImages = await loadImages(variantes.map((item) => item.imagen));
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
    if (section.kind !== "cards") return;

    section.items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = PADDING + col * (CARD_WIDTH + GAP);
      const cardY = y + row * (CARD_HEIGHT + GAP);
      drawVariantCard(ctx, item, imageByVariant.get(item) ?? null, x, cardY);
    });
    const rows = Math.ceil(section.items.length / columns);
    y += rows * CARD_HEIGHT + (rows - 1) * GAP + 30;
  });

  downloadCanvas(canvas, "variantes-disponibles-general.png");
}
