type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  message: string;
  context?: string;
  requestId?: string;
  data?: Record<string, unknown>;
  error?: unknown;
};

function serializeError(error: unknown) {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, payload: LogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: payload.message,
    ...(payload.context ? { context: payload.context } : {}),
    ...(payload.requestId ? { requestId: payload.requestId } : {}),
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.error ? { error: serializeError(payload.error) } : {}),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(payload: LogPayload) {
  writeLog("info", payload);
}

export function logWarn(payload: LogPayload) {
  writeLog("warn", payload);
}

export function logError(payload: LogPayload) {
  writeLog("error", payload);
}
