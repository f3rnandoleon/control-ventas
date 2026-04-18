"use client";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "VENDEDOR")) {
    return null;
  }

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar role={user.role} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
