"use client";

export default function StockCritico({
  productos,
}: {
  productos: {
    nombre: string;
    stockTotal: number;
    stockMinimo: number;
  }[];
}) {
  const criticos = productos.filter(
    (p) => p.stockTotal <= p.stockMinimo
  );

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-6
      shadow-[0_0_20px_rgba(255,0,0,0.15)]"
    >
      <h2 className="text-lg font-semibold text-red-400 mb-4">
        Stock crítico
      </h2>

      {criticos.length === 0 ? (
        <p className="text-gray-400 text-sm">
          Todo el stock está en niveles seguros
        </p>
      ) : (
        <ul className="space-y-3 text-sm text-gray-300">
          {criticos.map((p) => (
            <li
              key={p.nombre}
              className="flex justify-between"
            >
              <span>{p.nombre}</span>
              <span className="text-red-400 font-semibold">
                {p.stockTotal}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
