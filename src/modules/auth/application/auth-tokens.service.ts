import jwt from "jsonwebtoken";

type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

export type AuthTokenUser = {
  id: string;
  email: string;
  fullname: string;
  role: UserRole;
};

export function buildAuthTokenUser(user: {
  _id?: { toString(): string };
  id?: string;
  email: string;
  fullname: string;
  role: UserRole;
}): AuthTokenUser {
  const id = user.id || user._id?.toString();

  if (!id) {
    throw new Error("No se pudo resolver el id del usuario para JWT");
  }

  return {
    id,
    email: user.email,
    fullname: user.fullname,
    role: user.role,
  };
}

export function issueAuthTokens(user: AuthTokenUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) 
  {
    throw new Error("JWT_SECRET no está definido en las variables de entorno");
  }
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "1d") as jwt.SignOptions["expiresIn"];

  const accessToken = jwt.sign(user, secret, { expiresIn });
  const refreshToken = jwt.sign({ id: user.id }, secret, {
    expiresIn: "7d" as jwt.SignOptions["expiresIn"],
  });

  return {
    accessToken,
    refreshToken,
  };
}
