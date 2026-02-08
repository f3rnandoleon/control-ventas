import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            fullname: string;
            role: "ADMIN" | "VENDEDOR" | "CLIENTE";
        };
    }

    interface User {
        id: string;
        email: string;
        fullname: string;
        role: "ADMIN" | "VENDEDOR" | "CLIENTE";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: "ADMIN" | "VENDEDOR" | "CLIENTE";
    }
}
