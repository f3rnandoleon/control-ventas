"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // ⏳ Mientras carga auth o redirige
  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar role={user.role} />

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
