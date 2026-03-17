import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/libs/authOptions";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (session?.user?.role === "VENDEDOR") {
    redirect("/dashboard/vendedor");
  }

  return (
    <main className="page-glow min-h-screen px-6 py-16 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-2xl space-y-6">
          <span className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-1 text-sm font-medium text-sky-700 shadow-sm">
            Control Ventas
          </span>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            Gestiona ropa, stock y ventas desde un solo panel claro y ordenado.
          </h1>
          <p className="text-lg leading-8 text-slate-600">
            Plataforma para administrar productos, variantes, inventario, ventas
            y reportes con una interfaz luminosa en tonos azul, celeste y blanco.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="btn-primary min-w-40 justify-center text-center">
              Iniciar sesion
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="surface-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-sky-700">Catalogo vivo</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Variantes con multiples imagenes, QR y codigos de barra listos
              para venta y seguimiento.
            </p>
          </article>
          <article className="surface-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-sky-700">Inventario claro</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Visualiza stock critico, movimientos y disponibilidad por variante
              en tiempo real.
            </p>
          </article>
          <article className="surface-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-sky-700">Ventas agiles</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Registra ventas desde POS, controla el stock y consulta historicos
              sin salir del panel.
            </p>
          </article>
          <article className="surface-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-sky-700">Acceso por rol</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Administra permisos de admin y vendedor con proteccion server-side
              para rutas y APIs.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
