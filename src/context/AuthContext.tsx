"use client";

import { createContext, useContext } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  fullname: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const loading = status === "loading";

  const user: User | null = session?.user
    ? {
      id: session.user.id,
      email: session.user.email,
      fullname: session.user.fullname,
      role: session.user.role,
    }
    : null;

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    if (result?.ok) {
      // Esperar un momento para que la sesión se actualice
      await new Promise(resolve => setTimeout(resolve, 100));

      // Obtener la sesión actualizada para determinar el rol
      const response = await fetch("/api/auth/session");
      const sessionData = await response.json();

      if (sessionData?.user?.role === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (sessionData?.user?.role === "VENDEDOR") {
        router.push("/dashboard/vendedor");
      } else {
        router.push("/dashboard");
      }
    }
  };

  const logout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
