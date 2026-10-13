"use client";

import { Usuario } from "@/types/usuario";

export default function UsuarioTable({
  usuarios,
  onEdit,
  onDelete,
}: {
  usuarios: Usuario[];
  onEdit: (u: Usuario) => void;
  onDelete?: (u: Usuario) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <table className="w-full text-sm text-gray-300">
        <thead className="bg-white/5 text-gray-400">
          <tr>
            <th className="px-6 py-4 text-left">Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Sucursal Asignada</th>
            <th>Estado</th>
            <th className="text-right px-6">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {usuarios.map((u) => {
            const sucursalNombre =
              typeof u.sucursalAsignadaId === "object" && u.sucursalAsignadaId !== null
                ? `${(u.sucursalAsignadaId as unknown as { nombre: string; codigo: string }).nombre} (${(u.sucursalAsignadaId as unknown as { nombre: string; codigo: string }).codigo})`
                : u.sucursalAsignada?.nombre
                ? `${u.sucursalAsignada.nombre} (${u.sucursalAsignada.codigo})`
                : "— (Todas)";

            return (
              <tr
                key={u._id}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-white">{u.nombreCompleto}</p>
                  <p className="text-xs text-gray-400">
                    Creado: {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </td>

                <td>{u.email}</td>

                <td>
                  <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400 font-semibold">
                    {u.rol}
                  </span>
                </td>

                <td>
                  <span className="text-xs text-slate-300">
                    {sucursalNombre}
                  </span>
                </td>

                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold
                    ${
                      u.estaActivo
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {u.estaActivo ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td className="px-6 text-right space-x-3">
                  <button
                    onClick={() => onEdit(u)}
                    className="text-cyan-400 hover:text-cyan-300 font-medium text-xs transition"
                  >
                    Editar
                  </button>
                  {onDelete && u.estaActivo && (
                    <button
                      onClick={() => onDelete(u)}
                      className="text-rose-400 hover:text-rose-300 font-medium text-xs transition"
                    >
                      Dar de baja
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

          {usuarios.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-400">
                No hay usuarios registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
