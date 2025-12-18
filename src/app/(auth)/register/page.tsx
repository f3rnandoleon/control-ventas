"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrarse");
        return;
      }

      setSuccess("Registro exitoso, ahora inicia sesión");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Error de conexión");
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
            👤
          </div>
        </div>

        <h1 className="text-center text-white text-xl font-semibold mb-8 tracking-widest">
          REGISTER
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-sm text-green-300 bg-green-500/10 border border-green-400/30 rounded-lg px-4 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Fullname */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300">
              🧑
            </span>
            <input
              name="fullname"
              placeholder="Nombre completo"
              className="w-full bg-black/30 text-white placeholder-gray-300
                px-4 py-3 pl-11 rounded-lg
                border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={form.fullname}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300">
              📧
            </span>
            <input
              type="email"
              name="email"
              placeholder="correo@ejemplo.com"
              className="w-full bg-black/30 text-white placeholder-gray-300
                px-4 py-3 pl-11 rounded-lg
                border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={form.email}
              onChange={handleChange}
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
              name="password"
              placeholder="************"
              className="w-full bg-black/30 text-white placeholder-gray-300
                px-4 py-3 pl-11 rounded-lg
                border border-white/20
                focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={form.password}
              onChange={handleChange}
              required
            />
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
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-300">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-cyan-400 hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
