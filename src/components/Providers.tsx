"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import CookieConsentBanner from "@/components/web/CookieConsentBanner";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthProvider>
                <ThemeProvider>
                    {children}
                    <CookieConsentBanner />
                </ThemeProvider>
            </AuthProvider>
        </SessionProvider>
    );
}
