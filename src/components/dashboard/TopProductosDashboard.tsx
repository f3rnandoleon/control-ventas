"use client";

export default function TopProductosDashboard({
  productos,
}: {
  productos: { nombre: string; totalVendidos: number }[];
}) {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(0,180,255,0.15)]"
    >
      <h2 className="text-lg font-semibold text-cyan-400 mb-4">
        Top productos
      </h2>

      <ul className="space-y-3 text-sm text-gray-300">
        {productos.map((p, index) => (
          <li
            key={p.nombre}
            className="flex justify-between items-center
            border-b border-white/5 pb-2"
          >
            <span>
              #{index + 1} {p.nombre}
            </span>
            <span className="text-cyan-400 font-semibold">
              {p.totalVendidos}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
