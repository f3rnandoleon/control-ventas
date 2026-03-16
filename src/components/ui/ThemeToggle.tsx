"use client";

import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      className="surface-card-strong fixed right-4 top-4 z-[60] inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold text-sky-900 transition hover:-translate-y-0.5"
    >
      <span className="surface-subcard flex h-8 w-8 items-center justify-center rounded-full text-base">
        {isDark ? "O" : "C"}
      </span>
      <span>{isDark ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  );
}
