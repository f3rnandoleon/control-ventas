"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      // La redirección se maneja en AuthContext
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
      bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-[32px]
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-[0_0_40px_rgba(0,180,255,0.35)]
        p-10"
      >
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-full border border-cyan-400
            flex items-center justify-center text-cyan-400 text-3xl
            shadow-[0_0_20px_rgba(34,211,238,0.7)]"
          >
            📷
          </div>
        </div>

        <h1 className="text-center text-white text-xl font-semibold mb-8 tracking-widest">
          INICIAR SESION
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300">
              👤
            </span>
            <input
              type="email"
              placeholder="Correo Electronico"
              className="w-full bg-black/30 text-white placeholder-gray-300
                px-4 py-3 pl-11 rounded-lg
                border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300">
              🔒
            </span>
            <input
              type="password"
              placeholder="************"
              className="w-full bg-black/30 text-white placeholder-gray-300
                px-4 py-3 pl-11 rounded-lg
                border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Options */}
          <div className="flex justify-between items-center text-sm text-gray-300">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-cyan-400" />
              Mantener Sesion
            </label>
            <a href="/register" className="hover:text-cyan-400 transition">
              Registrarse
            </a>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white
              bg-gradient-to-r from-cyan-500 to-blue-600
              hover:from-cyan-400 hover:to-blue-500
              shadow-[0_0_20px_rgba(34,211,238,0.6)]
              transition disabled:opacity-50 hover:cursor-pointer"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
