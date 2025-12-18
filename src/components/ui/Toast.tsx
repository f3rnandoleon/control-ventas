"use client";

export default function Toast({
  message,
  type = "error",
  onClose,
}: {
  message: string;
  type?: "error" | "success";
  onClose: () => void;
}) {
  return (
    <div className="fixed top-5 right-5 z-50">
      <div
        className={`px-6 py-4 rounded-xl shadow-lg text-white
        ${type === "error" ? "bg-red-500" : "bg-green-500"}`}
      >
        <div className="flex justify-between items-center gap-4">
          <span>{message}</span>
          <button onClick={onClose} className="font-bold">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
