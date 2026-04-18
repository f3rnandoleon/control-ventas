import { randomUUID } from "crypto";

export function createRequestId() {
  return randomUUID();
}

export function resolveRequestId(
  request?: Request | { headers?: Headers | { get(name: string): string | null } | null } | null
) {
  if (!request?.headers) {
    return createRequestId();
  }

  const requestId = request.headers.get("x-request-id");
  return requestId || createRequestId();
}
