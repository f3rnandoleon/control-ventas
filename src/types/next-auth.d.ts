import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            nombreCompleto: string;
            rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
            sucursalAsignadaId?: string | null;
        };
    }

    interface User {
        id: string;
        email: string;
        nombreCompleto: string;
        rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
        sucursalAsignadaId?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
        email?: string;
        nombreCompleto?: string;
        sucursalAsignadaId?: string | null;
    }
}
