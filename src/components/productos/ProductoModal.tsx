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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 md:p-6 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[92dvh] rounded-2xl sm:rounded-3xl
        bg-slate-900 border border-white/15
        shadow-[0_0_50px_rgba(0,180,255,0.25)]
        animate-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-slate-900/90">
          <h2 className="text-base sm:text-xl font-bold text-cyan-400">
            {title || "Producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition active:scale-95 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll independiente */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}
