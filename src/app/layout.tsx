import "./globals.css";
import { Toaster } from "sonner";
import ClientOnly from "@/components/ClientOnly";
import { Providers } from "@/components/Providers";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="text-primary antialiased">
        <ClientOnly>
          <Providers>
            <ThemeToggle />
            {children}
            <Toaster
              richColors
              position="top-right"
              closeButton
            />
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}
