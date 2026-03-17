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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/20 backdrop-blur-sm">
      <div className="surface-card-strong w-full max-w-md rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-red-700">{title}</h2>

        {description && (
          <p className="mb-6 text-sm text-slate-600">
            {description}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}
