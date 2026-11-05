"use client";

import { parseGoogleMapsEmbedUrl, cleanGoogleMapsLink } from "@/utils/google-maps";

interface Props {
  title: string;
  subtitle?: string;
  url: string;
  onClose: () => void;
}

export default function MapPreviewModal({ title, subtitle, url, onClose }: Props) {
  const directLink = cleanGoogleMapsLink(url);
  const embedUrl = parseGoogleMapsEmbedUrl(url);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto min-h-[350px]">
          {embedUrl ? (
            <div className="w-full h-80 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/40">
              <iframe
                title={title}
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="w-full h-64 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Enlace a Google Maps registrado</p>
                <p className="text-xs text-gray-400 mt-1 max-w-md">
                  El enlace ingresado es un enlace corto o externo. Puedes abrirlo directamente para ver el punto en tu navegador o aplicación de mapas.
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="text-gray-400 truncate max-w-[400px] font-mono">{directLink}</span>
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-900/30"
            >
              <span>Abrir en Google Maps</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-white/10 flex justify-end bg-white/5">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all text-sm"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

