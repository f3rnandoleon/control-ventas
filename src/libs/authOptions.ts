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
                    throw new Error("Email y contraseña son obligatorios");
                }

                await connectDB();

                const user = await User.findOne({
                    email: credentials.email.toLowerCase(),
                }).select("+password");

                if (!user) {
                    throw new Error("Credenciales incorrectas");
                }

                if (!user.isActive) {
                    throw new Error("Usuario deshabilitado");
                }

                const isMatch = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isMatch) {
                    throw new Error("Credenciales incorrectas");
                }

                // Actualizar último login
                try {
                    user.lastLogin = new Date();
                    await user.save();
                } catch (error) {
                    console.error("Error actualizando lastLogin:", error);
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    fullname: user.fullname,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 1 día
    },
    secret: process.env.NEXTAUTH_SECRET,
};
