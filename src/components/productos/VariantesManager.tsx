"use client";

import { useState } from "react";
import { Variante, Producto } from "@/types/producto";
import VarianteForm from "./VarianteForm";
import VarianteRow from "./VarianteRow";
import { updateProducto } from "@/services/producto.service";
import { generarPDFQrs } from "@/utils/generarPDFQrs";
import { generarPDFCodigosBarras } from "@/utils/generarPDFCodigosBarras";

type Mode = "LIST" | "ADD" | "EDIT";

export default function VariantesManager({
  producto,
  onUpdated,
}: {
  producto: Producto;
  onUpdated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("LIST");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const saveVariantes = async (variantes: Variante[]) => {
    setLoading(true);
    await updateProducto(producto._id, { variantes });
    await onUpdated();
    setMode("LIST");
    setEditingIndex(null);
    setLoading(false);
  };

  /* =========================
     ADD / EDIT VIEW
  ========================= */
  if (mode === "ADD" || mode === "EDIT") {
    return (
      <div
        className="bg-white/5 border border-white/10 rounded-2xl p-6
        shadow-[0_0_20px_rgba(0,180,255,0.2)] space-y-4"
      >
        <h3 className="text-lg font-semibold text-cyan-400">
          {mode === "ADD" ? "Agregar variante" : "Editar variante"}
        </h3>

        <VarianteForm
          initialData={
            mode === "EDIT" && editingIndex !== null
              ? producto.variantes[editingIndex]
              : undefined
          }
          onSave={(data) => {
            const nuevas = [...producto.variantes];

            if (mode === "EDIT" && editingIndex !== null) {
              nuevas[editingIndex] = data;
            } else {
              nuevas.push(data);
            }

            saveVariantes(nuevas);
          }}
          onCancel={() => {
            setMode("LIST");
            setEditingIndex(null);
          }}
        />

        {loading && (
          <p className="text-sm text-gray-400 text-center">
            Guardando cambios...
          </p>
        )}
      </div>
    );
  }

  /* =========================
     LIST VIEW
  ========================= */
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)] space-y-4"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-cyan-400">
          Variantes
        </h3>

        <div className="flex gap-2">
          <button
            className="btn-primary px-4 py-2"
            onClick={() => setMode("ADD")}
          >
            + Agregar variante
          </button>

          <button
            className="btn-primary px-4 py-2"
            onClick={() => {
              const variantesConQR = producto.variantes
                .filter((v) => v.qrCode)
                .map((v) => ({
                  codigo: v.qrCode!,
                }));

              if (variantesConQR.length === 0) return;

              generarPDFQrs(
                variantesConQR,
                `QR Variantes - ${producto.nombre}`
              );
            }}
          >
            Generar QR de todas
          </button>
          <button
            className="btn-primary px-4 py-2"
            onClick={() => {
              const variantesConCodigo = producto.variantes
                .filter((v) => v.codigoBarra)
                .map((v) => ({
                  codigo: v.codigoBarra!,
                }));

              if (variantesConCodigo.length === 0) return;

              generarPDFCodigosBarras(
                variantesConCodigo,
                `Códigos de barras - ${producto.nombre}`
              );
            }}
          >
            Generar códigos de barras
          </button>

        </div>

      </div>

      {/* Empty state */}
      {producto.variantes.length === 0 && (
        <p className="text-gray-400 text-sm">
          No hay variantes registradas.
        </p>
      )}

      {/* Table */}
      {producto.variantes.length > 0 && (
        <table className="w-full text-sm text-gray-300">
          <thead className="border-b border-white/10 text-gray-400">
            <tr>
              <th className="py-3">Color</th>
              <th>Talla</th>
              <th>Stock</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {producto.variantes.map((v, index) => (
              <VarianteRow
                key={`${v.color}-${v.talla}`}
                variante={v}
                onEdit={() => {
                  setEditingIndex(index);
                  setMode("EDIT");
                }}
                onDelete={() => {
                  const nuevas = producto.variantes.filter(
                    (_, i) => i !== index
                  );
                  saveVariantes(nuevas);
                }}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
