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
      <div className="flex min-h-screen items-center justify-center bg-primary text-primary">
        Cargando...
      </div>
    );
  }

  if (!user || (user.rol !== "ADMIN" && user.rol !== "VENDEDOR")) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-primary text-primary overflow-hidden font-outfit transition-colors">
      <Sidebar role={user.rol} />

      <main className="page-glow flex-1 overflow-y-auto p-4 md:p-6 transition-colors">
        <div className="mx-auto max-w-7xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
