"use client";

export default function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div
        className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl
        border border-white/20 p-6 shadow-[0_0_40px_rgba(255,0,0,0.35)]"
      >
        <h2 className="text-lg font-semibold text-red-400 mb-2">
          {title}
        </h2>

        {description && (
          <p className="text-sm text-gray-300 mb-6">
            {description}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20
              text-gray-300 hover:bg-white/10 transition"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500
              hover:bg-red-600 text-white transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
