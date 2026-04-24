import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            nombreCompleto: string;
            rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
        };
    }

    interface User {
        id: string;
        email: string;
        nombreCompleto: string;
        rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
        email?: string;
        nombreCompleto?: string;
    }
}
