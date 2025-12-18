"use client";

import { useState } from "react";
import { createVenta } from "@/services/venta.service";
import { Producto } from "@/types/producto";
import Toast from "../ui/Toast";

interface Item {
  productoId: string;
  color: string;
  talla: string;
  cantidad: number;
  stockDisponible: number;
}

export default function VentaPOS({
  productos,
  onSuccess,
}: {
  productos: Producto[];
  onSuccess: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "QR">("EFECTIVO");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const agregarItem = () => {
    setItems([
      ...items,
      { productoId: "", color: "", talla: "", cantidad: 1, stockDisponible:1 },
    ]);
  };

  const registrarVenta = async () => {
    try {
      if (!ventaValida) {
        setToast({
          message: "Completa correctamente todos los productos",
          type: "error",
        });
        return;
      }

      setLoading(true);

      await createVenta({
        items,
        metodoPago,
        tipoVenta: "TIENDA",
      });

      setItems([]);
      setToast({
        message: "Venta registrada correctamente",
        type: "success",
      });

      onSuccess();
    } catch (error: any) {
      setToast({
        message: error.message || "Error al registrar venta",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    if (!item.productoId || !item.cantidad) return sum;

    const producto = productos.find(p => p._id === item.productoId);
    if (!producto) return sum;

    return sum + producto.precioVenta * item.cantidad;
  }, 0);

  const total = subtotal; // luego puedes sumar impuesto / restar descuento
  const ventaValida =
  items.length > 0 &&
  items.every(
    (item) =>
      item.productoId &&
      item.color &&
      item.talla &&
      item.cantidad > 0 &&
      item.cantidad <= item.stockDisponible
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-cyan-400">
        Nueva venta
      </h2>

      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-3 gap-3">
          <select
            className="input"
            onChange={(e) => {
              const producto = productos.find(p => p._id === e.target.value);
              if (!producto) return;

              const n = [...items];
              n[index] = {
                productoId: producto._id,
                color: "",
                talla: "",
                cantidad: 1,
                stockDisponible: 0,
              };
              setItems(n);
            }}
          >
            <option value="">Producto</option>
            {productos.map(p => (
              <option key={p._id} value={p._id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={`${item.color}-${item.talla}`}
            onChange={(e) => {
              const producto = productos.find(p => p._id === item.productoId);
              if (!producto) return;

              const variante = producto.variantes.find(
                v => `${v.color}-${v.talla}` === e.target.value
              );
              if (!variante) return;

              const n = [...items];
              n[index] = {
                ...n[index],
                color: variante.color,
                talla: variante.talla,
                cantidad: 1,
                stockDisponible: variante.stock,
              };
              setItems(n);
            }}
            disabled={!item.productoId}
          >
            <option value="">Variante</option>
            {productos
              .find(p => p._id === item.productoId)
              ?.variantes.map(v => (
                <option
                  key={`${v.color}-${v.talla}`}
                  value={`${v.color}-${v.talla}`}
                >
                  {v.color} - {v.talla} (Stock: {v.stock})
                </option>
              ))}
          </select>

          <input
            className="input"
            placeholder="Color"
            value={item.color}
            readOnly
          />

          <input
            className="input"
            placeholder="Talla"
            value={item.talla}
            readOnly
          />

          <input
            type="number"
            className="input"
            min={1}
            max={item.stockDisponible}
            value={item.cantidad}
            disabled={!item.stockDisponible}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value > item.stockDisponible) return;

              const n = [...items];
              n[index].cantidad = value;
              setItems(n);
            }}
          />

        </div>
      ))}
      <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-gray-300">
          <span>Subtotal</span>
          <span>Bs {subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-white font-semibold text-lg">
          <span>Total</span>
          <span className="text-cyan-400">
            Bs {total.toFixed(2)}
          </span>
        </div>
      </div>

      <button className="btn-link" onClick={agregarItem}>
        + Agregar producto
      </button>

      <select
        className="input"
        value={metodoPago}
        onChange={(e) =>
          setMetodoPago(e.target.value as "EFECTIVO" | "QR")
        }
      >
        <option value="EFECTIVO">Efectivo</option>
        <option value="QR">QR</option>
      </select>

      <button
        className="btn-primary"
        onClick={registrarVenta}
        disabled={!ventaValida || loading}
      >
        {loading ? "Registrando..." : "Registrar venta"}
      </button>
        {toast && (
    <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}

    </div>
    
  );
}
