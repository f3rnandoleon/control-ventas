import { NextResponse } from "next/server";
import { isAppError } from "@/shared/errors/AppError";
import { logError } from "@/shared/observability/logger";

type HandleRouteErrorOptions = {
  fallbackMessage: string;
  logLabel: string;
};

export function handleRouteError(
  error: unknown,
  { fallbackMessage, logLabel }: HandleRouteErrorOptions
) {
  if (isAppError(error)) {
    return NextResponse.json(
      { message: error.message, ...(error.code ? { code: error.code } : {}) },
      { status: error.statusCode }
    );
  }

  logError({
    message: fallbackMessage,
    context: logLabel,
    error,
  });
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
