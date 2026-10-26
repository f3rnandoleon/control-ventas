"use client";



export default function ProductoModal({
  open,
  onClose,
  title,
  maxWidth = "max-w-2xl",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/80 p-2 sm:p-5 md:p-6 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`relative flex flex-col w-full ${maxWidth} max-h-[94dvh] sm:max-h-[92dvh] rounded-2xl sm:rounded-3xl
        bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15
        shadow-2xl dark:shadow-[0_0_50px_rgba(0,180,255,0.25)]
        animate-in zoom-in-95 duration-150 overflow-hidden transition-colors`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/10 p-4 sm:p-5 bg-white/95 dark:bg-slate-900/90">
          <h2 className="text-base sm:text-xl font-bold text-sky-700 dark:text-cyan-400">
            {title || "Producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll independiente */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-800 dark:text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}
