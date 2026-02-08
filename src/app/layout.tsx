import "./globals.css";
import { Toaster } from "sonner";
import ClientOnly from "@/components/ClientOnly";
import { Providers } from "@/components/Providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-900 text-white">
        <ClientOnly>
          <Providers>
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
