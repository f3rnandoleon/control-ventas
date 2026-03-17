"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-glow min-h-screen px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 text-slate-900">
          <span className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-1 text-sm font-medium text-sky-700 shadow-sm">
            Acceso seguro
          </span>
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Ingresa a tu panel y continua donde te quedaste.
          </h1>
          <p className="max-w-xl text-base leading-8 text-slate-600">
            El sistema de administracion mantiene acceso por rol y una interfaz
            clara en tonos azul, celeste y blanco.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link href="/" className="font-medium transition hover:text-sky-700">
              Volver al inicio
            </Link>
            <Link
              href="https://www.youtube.com"
              className="font-medium transition hover:text-sky-700"
            >
              Ver pagina web
            </Link>
          </div>
        </section>

        <div className="surface-card-strong rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-700">
              Iniciar sesion
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Bienvenido de nuevo
            </h2>
            {callbackUrl && (
              <p className="mt-2 text-sm text-slate-600">
                Al entrar te llevaremos a tu ruta solicitada.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="input"
                required
              />
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-600">
              Acceso restringido para administradores y vendedores registrados por
              el sistema.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
