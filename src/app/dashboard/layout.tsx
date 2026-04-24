"use client";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (user.rol !== "ADMIN" && user.rol !== "VENDEDOR"))) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400 bg-neutral-900">
        Cargando...
      </div>
    );
  }

  if (!user || (user.rol !== "ADMIN" && user.rol !== "VENDEDOR")) {
    return null;
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-white overflow-hidden font-outfit">
      <Sidebar role={user.rol} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
