"use client";

import { Variante } from "@/types/producto";

export default function VarianteRow({
  variante,
  onEdit,
  onDelete,
}: {
  variante: Variante;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/5">
      <td className="py-2">{variante.color}</td>
      <td>{variante.talla}</td>
      <td>{variante.stock}</td>
      <td className="text-right space-x-3">
        <button className="btn-link" onClick={onEdit}>
          Editar
        </button>
        <button className="btn-danger" onClick={onDelete}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}
