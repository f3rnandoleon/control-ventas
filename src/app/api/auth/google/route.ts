import { NextResponse } from "next/server";
import {
  validateRequest,
  validationErrorResponse,
} from "@/middleware/validate.middleware";
import { authenticateWithGoogleIdToken } from "@/modules/auth/application/google-auth.service";
import { googleAuthSchema } from "@/schemas/auth.schema";
import { handleRouteError } from "@/shared/http/handleRouteError";

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(googleAuthSchema, request);

    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const result = await authenticateWithGoogleIdToken(
      validation.data.idToken
    );

    return NextResponse.json(
      {
        message: result.message,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        created: result.created,
        linkedExistingAccount: result.linkedExistingAccount,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Error al autenticar con Google",
      logLabel: "POST auth google error:",
    });
  }
}
