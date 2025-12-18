"use client";



export default function ProductoModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-3xl
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-[0_0_50px_rgba(0,180,255,0.35)]
        p-8 animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-cyan-400">
            {title || "Producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
