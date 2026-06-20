import { NextResponse } from "next/server";
import { resolveApiAuth, type AuthUser } from "@/libs/resolveApiAuth";

type AuthGuardSuccess = {
  userAuth: AuthUser;
  response?: never;
};

type AuthGuardFailure = {
  userAuth?: never;
  response: NextResponse;
};

type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

export async function requireApiAuth(
  request: Request,
  allowedRoles?: AuthUser["rol"][]
): Promise<AuthGuardResult> {
  const userAuth = await resolveApiAuth(request);

  if (!userAuth) {
    return {
      response: NextResponse.json({ message: "No autenticado" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(userAuth.rol)) {
    return {
      response: NextResponse.json({ message: "No autorizado" }, { status: 403 }),
    };
  }

  return { userAuth };
}

export function requireAdminApiAuth(request: Request) {
  return requireApiAuth(request, ["ADMIN"]);
}

export function requireStaffApiAuth(request: Request) {
  return requireApiAuth(request, ["ADMIN", "VENDEDOR"]);
}
