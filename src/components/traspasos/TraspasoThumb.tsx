"use client";

import { useState } from "react";

interface TraspasoThumbProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  xs: "w-7 h-7 text-xs rounded-md",
  sm: "w-10 h-10 text-sm rounded-xl",
  md: "w-14 h-14 text-base rounded-xl",
  lg: "w-20 h-20 text-xl rounded-2xl",
  xl: "w-28 h-28 text-2xl rounded-2xl",
};

export default function TraspasoThumb({
  src,
  alt = "Prenda",
  size = "sm",
  className = "",
  onClick,
}: TraspasoThumbProps) {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = sizeMap[size] || sizeMap.sm;

  const showImage = Boolean(src) && !hasError;

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden border border-white/10 bg-slate-800/80 shadow-inner flex items-center justify-center select-none ${sizeClasses} ${
        onClick ? "cursor-pointer transition-transform hover:scale-105 hover:ring-2 hover:ring-cyan-500/50" : ""
      } ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 text-indigo-400/80">
          <svg
            className="w-1/2 h-1/2 opacity-70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 4.5l3.5 2.5 3.5-2.5 4 3-1.5 3.5h-1v8.5a1 1 0 01-1 1h-8a1 1 0 01-1-1V11h-1L3.5 7.5l4-3z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
