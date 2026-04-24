import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y contrasena son obligatorios");
        }

        await connectDB();

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).select("+password");

        if (!user) {
          throw new Error("Credenciales incorrectas");
        }

        if (!user.estaActivo) {
          throw new Error("Usuario deshabilitado");
        }

        if (!user.password) {
          throw new Error(
            "Esta cuenta usa Google. Ingresa con Google desde la web de clientes."
          );
        }

        const isMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isMatch) {
          throw new Error("Credenciales incorrectas");
        }

        try {
          user.ultimoAcceso = new Date();
          await user.save();
        } catch (error) {
          console.error("Error actualizando ultimoAcceso:", error);
        }

        return {
          id: user._id.toString(),
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          rol: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
        token.email = user.email;
        token.nombreCompleto = user.nombreCompleto;
      }

      if (trigger === "update") {
        if (session?.email) {
          token.email = session.email;
        }

        if (session?.nombreCompleto) {
          token.nombreCompleto = session.nombreCompleto;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.rol = token.rol as "ADMIN" | "VENDEDOR" | "CLIENTE";
        session.user.email = (token.email as string) || session.user.email;
        session.user.nombreCompleto =
          (token.nombreCompleto as string) || session.user.nombreCompleto;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
