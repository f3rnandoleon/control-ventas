"use client";

import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      className={`surface-card-strong inline-flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-sky-900 transition hover:-translate-y-0.5 ${className}`}
    >
      <span className="surface-subcard flex h-8 w-8 items-center justify-center rounded-full text-base">
        {isDark ? "O" : "C"}
      </span>
      <span>{isDark ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  );
}
