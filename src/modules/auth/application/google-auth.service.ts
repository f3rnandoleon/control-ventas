import { OAuth2Client } from "google-auth-library";
import { connectDB } from "@/libs/mongodb";
import User, { type AuthProvider } from "@/models/user";
import { ensureCustomerProfileForUser } from "@/modules/customers/application/customers.service";
import { AppError } from "@/shared/errors/AppError";
import { buildAuthTokenUser, issueAuthTokens } from "./auth-tokens.service";

type UserRole = "ADMIN" | "VENDEDOR" | "CLIENTE";

type GoogleIdentity = {
  googleId: string;
  email: string;
  fullname: string;
  avatarUrl: string | null;
  emailVerified: boolean;
};

type AuthUserDocument = {
  _id: { toString(): string };
  email: string;
  fullname: string;
  role: UserRole;
  isActive: boolean;
  authProviders?: AuthProvider[];
  googleId?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  lastLogin?: Date;
  save: () => Promise<unknown>;
};

export type GoogleAuthResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullname: string;
    role: UserRole;
  };
  message: string;
  created: boolean;
  linkedExistingAccount: boolean;
};

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new AppError(
      "Google login no esta configurado. Falta GOOGLE_CLIENT_ID.",
      503,
      "GOOGLE_AUTH_NOT_CONFIGURED"
    );
  }

  return clientId;
}

function createGoogleClient() {
  return new OAuth2Client(getGoogleClientId());
}

function getAuthProviders(user: AuthUserDocument) {
  return Array.isArray(user.authProviders) ? [...user.authProviders] : [];
}

function includeProvider(
  user: AuthUserDocument,
  provider: AuthProvider
): AuthProvider[] {
  const providers = getAuthProviders(user);

  if (!providers.includes(provider)) {
    providers.push(provider);
  }

  return providers;
}

function getFallbackFullname(email: string) {
  return email.split("@")[0] || "Cliente";
}

async function verifyGoogleIdentity(idToken: string): Promise<GoogleIdentity> {
  const client = createGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: getGoogleClientId(),
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new AppError("No se pudo validar la identidad de Google.", 401);
  }

  if (!payload.email_verified) {
    throw new AppError(
      "Tu cuenta de Google debe tener el correo verificado para continuar.",
      401
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    fullname: payload.name?.trim() || getFallbackFullname(payload.email),
    avatarUrl: payload.picture || null,
    emailVerified: Boolean(payload.email_verified),
  };
}

function assertGoogleLoginAllowed(user: AuthUserDocument) {
  if (!user.isActive) {
    throw new AppError(
      "Tu cuenta existe pero esta deshabilitada. No puedes ingresar con Google.",
      403,
      "ACCOUNT_DISABLED"
    );
  }

  if (user.role !== "CLIENTE") {
    throw new AppError(
      "El acceso con Google esta disponible solo para cuentas de clientes.",
      403,
      "GOOGLE_ONLY_FOR_CLIENTS"
    );
  }
}

async function updateLastLogin(user: AuthUserDocument) {
  user.lastLogin = new Date();
  await user.save();
}

export async function authenticateWithGoogleIdToken(
  idToken: string
): Promise<GoogleAuthResult> {
  const identity = await verifyGoogleIdentity(idToken);

  await connectDB();

  const userByGoogleId = (await User.findOne({
    googleId: identity.googleId,
  })) as AuthUserDocument | null;

  if (userByGoogleId) {
    assertGoogleLoginAllowed(userByGoogleId);

    if (userByGoogleId.email !== identity.email) {
      const emailOwner = await User.findOne({
        email: identity.email,
        _id: { $ne: userByGoogleId._id },
      });

      if (emailOwner) {
        throw new AppError(
          "El correo de Google ya esta vinculado a otra cuenta.",
          409,
          "GOOGLE_EMAIL_ALREADY_IN_USE"
        );
      }

      userByGoogleId.email = identity.email;
    }

    userByGoogleId.fullname = identity.fullname || userByGoogleId.fullname;
    userByGoogleId.avatarUrl = identity.avatarUrl;
    userByGoogleId.emailVerified = identity.emailVerified;
    userByGoogleId.authProviders = includeProvider(userByGoogleId, "google");
    await updateLastLogin(userByGoogleId);

    const authUser = buildAuthTokenUser({
      _id: userByGoogleId._id,
      email: userByGoogleId.email,
      fullname: userByGoogleId.fullname,
      role: userByGoogleId.role,
    });

    return {
      ...issueAuthTokens(authUser),
      user: authUser,
      message: "Login con Google exitoso.",
      created: false,
      linkedExistingAccount: false,
    };
  }

  const userByEmail = (await User.findOne({
    email: identity.email,
  })) as AuthUserDocument | null;

  if (userByEmail) {
    assertGoogleLoginAllowed(userByEmail);

    if (userByEmail.googleId && userByEmail.googleId !== identity.googleId) {
      throw new AppError(
        "Este correo ya esta vinculado a otra cuenta de Google.",
        409,
        "GOOGLE_ACCOUNT_CONFLICT"
      );
    }

    userByEmail.googleId = identity.googleId;
    userByEmail.avatarUrl = identity.avatarUrl;
    userByEmail.emailVerified = identity.emailVerified;
    userByEmail.authProviders = includeProvider(userByEmail, "google");

    if (!userByEmail.fullname?.trim()) {
      userByEmail.fullname = identity.fullname;
    }

    await updateLastLogin(userByEmail);

    const authUser = buildAuthTokenUser({
      _id: userByEmail._id,
      email: userByEmail.email,
      fullname: userByEmail.fullname,
      role: userByEmail.role,
    });

    return {
      ...issueAuthTokens(authUser),
      user: authUser,
      message:
        "Se detecto un correo igual y se lo vinculo exitosamente con Google.",
      created: false,
      linkedExistingAccount: true,
    };
  }

  const createdUser = (await User.create({
    email: identity.email,
    fullname: identity.fullname,
    role: "CLIENTE",
    isActive: true,
    authProviders: ["google"],
    googleId: identity.googleId,
    avatarUrl: identity.avatarUrl,
    emailVerified: identity.emailVerified,
    lastLogin: new Date(),
  })) as AuthUserDocument;

  await ensureCustomerProfileForUser(createdUser._id.toString());

  const authUser = buildAuthTokenUser({
    _id: createdUser._id,
    email: createdUser.email,
    fullname: createdUser.fullname,
    role: createdUser.role,
  });

  return {
    ...issueAuthTokens(authUser),
    user: authUser,
    message: "Cuenta creada automaticamente con Google.",
    created: true,
    linkedExistingAccount: false,
  };
}
