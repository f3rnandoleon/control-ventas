"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { IBanner } from "@/types/banner";

interface BannerWithAction extends IBanner {
  actionUrl?: string;
}

interface Props {
  initialBanners?: BannerWithAction[];
  autoplayIntervalMs?: number;
  className?: string;
}

export default function HeroBannerCarousel({
  initialBanners,
  autoplayIntervalMs = 5500,
  className = "",
}: Props) {
  const [banners, setBanners] = useState<BannerWithAction[]>(initialBanners || []);
  const [loading, setLoading] = useState(!initialBanners);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) return;

    let isMounted = true;
    fetch("/api/public/banners")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: BannerWithAction[]) => {
        if (isMounted) {
          setBanners(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching public banners:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialBanners]);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay inteligente solo si hay 2 o más banners
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoplayIntervalMs);

    return () => clearInterval(timer);
  }, [total, isPaused, autoplayIntervalMs, nextSlide]);

  // Gestos táctiles (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      nextSlide();
    } else if (diff < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (loading) {
    return (
      <div className={`w-full aspect-[16/7] md:aspect-[21/8] rounded-3xl bg-slate-900/40 border border-white/5 animate-pulse ${className}`} />
    );
  }

  if (total === 0) {
    return null;
  }

  // Enfoque A: Si hay exactamente 1 banner activo, se muestra estático sin controles ni rotación
  if (total === 1) {
    const banner = banners[0];
    const Wrapper = banner.actionUrl ? "a" : "div";
    const wrapperProps = banner.actionUrl
      ? {
          href: banner.actionUrl,
          target: banner.actionUrl.startsWith("http") ? "_blank" : undefined,
          rel: banner.actionUrl.startsWith("http") ? "noopener noreferrer" : undefined,
        }
      : {};

    return (
      <div className={`w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl ${className}`}>
        <Wrapper
          {...wrapperProps}
          className="relative block w-full aspect-[16/8] sm:aspect-[16/7] md:aspect-[21/8] bg-black/50 group cursor-pointer"
        >
          <picture>
            {banner.imagenMobileUrl && (
              <source media="(max-width: 640px)" srcSet={banner.imagenMobileUrl} />
            )}
            <img
              src={banner.imagenDesktopUrl}
              alt={banner.titulo}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
              loading="eager"
            />
          </picture>

          {banner.actionUrl && banner.tipoAccion === "WHATSAPP" && (
            <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 backdrop-blur-md text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all group-hover:scale-105">
              <span>💬 Consultar por WhatsApp</span>
            </div>
          )}
        </Wrapper>
      </div>
    );
  }

  // Enfoque A: 2 o más banners -> Carrusel Inteligente con rotación suave y controles
  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl select-none group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="relative w-full aspect-[16/8] sm:aspect-[16/7] md:aspect-[21/8] bg-black/60 overflow-hidden">
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          const Wrapper = banner.actionUrl ? "a" : "div";
          const wrapperProps = banner.actionUrl
            ? {
                href: banner.actionUrl,
                target: banner.actionUrl.startsWith("http") ? "_blank" : undefined,
                rel: banner.actionUrl.startsWith("http") ? "noopener noreferrer" : undefined,
              }
            : {};

          return (
            <div
              key={banner._id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <Wrapper
                {...wrapperProps}
                className="relative block w-full h-full group/slide cursor-pointer"
              >
                <picture>
                  {banner.imagenMobileUrl && (
                    <source media="(max-width: 640px)" srcSet={banner.imagenMobileUrl} />
                  )}
                  <img
                    src={banner.imagenDesktopUrl}
                    alt={banner.titulo}
                    className="w-full h-full object-cover group-hover/slide:scale-[1.02] transition-transform duration-700"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </picture>

                {banner.actionUrl && banner.tipoAccion === "WHATSAPP" && (
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 py-2 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-xl shadow-emerald-950/40 flex items-center gap-2 transition-all group-hover/slide:scale-105">
                    <span>💬 Consultar al 67113105</span>
                  </div>
                )}
              </Wrapper>
            </div>
          );
        })}
      </div>

      {/* Flechas de navegación (visibles en hover o móvil) */}
      <button
        onClick={prevSlide}
        aria-label="Banner anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all border border-white/20 hover:scale-110"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        aria-label="Siguiente banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center opacity-80 md:opacity-0 group-hover:opacity-100 transition-all border border-white/20 hover:scale-110"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicadores de puntos (Dots) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Ir al banner ${idx + 1}`}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? "w-6 h-2 bg-cyan-400 shadow-sm shadow-cyan-400/50"
                : "w-2 h-2 bg-white/40 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

