"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPoliticasPublicas } from "@/services/ajustes.service";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState(
    "Utilizamos cookies para garantizar la mejor experiencia en nuestra tienda online."
  );

  useEffect(() => {
    // Verificar si ya fue aceptado previamente
    const accepted = localStorage.getItem("fit_andes_cookie_consent");
    if (accepted === "true") {
      return;
    }

    // Consultar configuración pública
    getPoliticasPublicas()
      .then((data) => {
        if (data?.cookies?.mostrarBanner !== false) {
          if (data?.cookies?.mensajeBanner) {
            setMensaje(data.cookies.mensajeBanner);
          }
          setVisible(true);
        }
      })
      .catch((err) => {
        console.warn("No se pudo cargar la preferencia de cookies:", err);
      });
  }, []);

  const handleAccept = () => {
    localStorage.setItem("fit_andes_cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Aviso de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-2xl border border-sky-200 bg-white/95 p-4 md:p-5 shadow-[0_10px_35px_rgba(2,132,199,0.18)] backdrop-blur-md animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <span className="text-2xl select-none" role="img" aria-label="galleta">
            🍪
          </span>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {mensaje}{" "}
            <Link
              href="/politica-cookies"
              className="font-semibold text-sky-600 underline hover:text-sky-800"
            >
              Más información
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleAccept}
            className="btn-primary py-2 px-5 text-xs font-bold rounded-xl shadow-xs"
          >
            Aceptar
          </button>
        </div>
      </div>
    </aside>
  );
}
