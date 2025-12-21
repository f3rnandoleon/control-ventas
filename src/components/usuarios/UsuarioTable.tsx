"use client";

import { Usuario } from "@/types/usuario";

export default function UsuarioTable({
  usuarios,
  onEdit,
}: {
  usuarios: Usuario[];
  onEdit: (u: Usuario) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <table className="w-full text-sm text-gray-300">
        <thead className="bg-white/5 text-gray-400">
          <tr>
            <th className="px-6 py-4 text-left">Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th className="text-right px-6">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {usuarios.map((u) => (
            <tr
              key={u._id}
              className="border-t border-white/5 hover:bg-white/5 transition"
            >
              <td className="px-6 py-4">
                <p className="font-semibold">{u.fullname}</p>
                <p className="text-xs text-gray-400">
                  Creado: {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </td>

              <td>{u.email}</td>

              <td>
                <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">
                  {u.role}
                </span>
              </td>

              <td>
                <span
                  className={`px-2 py-1 rounded text-xs
                  ${
                    u.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {u.isActive ? "Activo" : "Inactivo"}
                </span>
              </td>

              <td className="px-6 text-right">
                <button
                  onClick={() => onEdit(u)}
                  className="text-cyan-400 hover:underline"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}

          {usuarios.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-6 text-gray-400">
                No hay usuarios registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
