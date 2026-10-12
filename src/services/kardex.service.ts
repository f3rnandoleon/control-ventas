import type {
  KardexConsolidadoResumen,
  KardexMovimiento,
} from "@/types/inventario";

export interface KardexProductoDetalleResponse {
  producto: {
    _id: string;
    nombre: string;
    modelo: string;
    sku: string;
    categoria?: string;
    precioCostoBase: number;
    precioVentaBase: number;
    variantes: Array<{
      varianteId?: string;
      color: string;
      colorSecundario?: string;
      talla: string;
      stock: number;
      precioCosto?: number;
      precioVenta?: number;
    }>;
  };
  saldoFisicoActual: number;
  saldoValoradoActual: number;
  costoPromedioActual: number;
  movimientos: KardexMovimiento[];
}

export async function getKardexConsolidado(): Promise<KardexConsolidadoResumen> {
  const res = await fetch("/api/inventario/kardex/consolidado");

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al obtener kardex consolidado");
  }

  return res.json();
}

export async function getKardexProducto(
  productoId: string,
  varianteId?: string
): Promise<KardexProductoDetalleResponse> {
  const url = varianteId
    ? `/api/inventario/kardex/${productoId}?varianteId=${encodeURIComponent(varianteId)}`
    : `/api/inventario/kardex/${productoId}`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Error al obtener kardex del producto");
  }

  return res.json();
}
