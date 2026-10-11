import Link from "next/link";
import React from "react";

interface PoliticaLayoutProps {
  titulo: string;
  subtitulo?: string;
  ultimaActualizacion?: string | Date;
  children: React.ReactNode;
}

export default function PoliticaLayout({
  titulo,
  subtitulo,
  ultimaActualizacion,
  children,
}: PoliticaLayoutProps) {
  const fechaStr = ultimaActualizacion
    ? new Date(ultimaActualizacion).toLocaleDateString("es-BO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Vigente";

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 font-black text-white shadow-sm group-hover:scale-105 transition">
              FA
            </span>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              Fit Andes
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 transition"
          >
            ← Volver a la Tienda
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <header className="mb-10 text-center sm:text-left border-b border-slate-100 pb-8">
          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
            Documento Legal Oficial
          </span>
          <h1 className="mt-3 text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mt-2 text-sm md:text-base text-slate-600">
              {subtitulo}
            </p>
          )}
          <p className="mt-4 text-xs font-semibold text-slate-400">
            Última actualización: {fechaStr}
          </p>
        </header>

        {/* Content Box */}
        <article className="surface-card rounded-3xl border border-sky-100 bg-white p-6 sm:p-10 shadow-sm leading-relaxed text-slate-700 space-y-4">
          {children}
        </article>

        {/* Bottom Legal Navigation */}
        <nav className="mt-12 rounded-2xl bg-sky-50/60 p-6 border border-sky-100 text-center">
          <p className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-4">
            Otras Políticas y Términos
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-sky-700">
            <Link href="/politica-devolucion" className="hover:underline">
              Devoluciones y Cambios
            </Link>
            <span>•</span>
            <Link href="/politica-privacidad" className="hover:underline">
              Política de Privacidad
            </Link>
            <span>•</span>
            <Link href="/terminos-condiciones" className="hover:underline">
              Términos y Condiciones
            </Link>
            <span>•</span>
            <Link href="/politica-cookies" className="hover:underline">
              Política de Cookies
            </Link>
          </div>
        </nav>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Fit Andes. Todos los derechos reservados.
      </footer>
    </div>
  );
}
