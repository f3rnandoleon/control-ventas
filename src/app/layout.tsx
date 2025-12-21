import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import ClientOnly from "@/components/ClientOnly";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-900 text-white">
        <ClientOnly>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster
              richColors
              position="top-right"
              closeButton
            />
          </ThemeProvider>
        </AuthProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
