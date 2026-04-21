import type { ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import AuditEvent from "@/models/auditEvent";
import { logError } from "@/shared/observability/logger";

export type AuditStatus = "SUCCESS" | "FAILED";
export type AuditActorRole = "ADMIN" | "VENDEDOR" | "CLIENTE" | "SYSTEM";

type RecordAuditEventInput = {
  requestId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  actorRole?: AuditActorRole | null;
  status: AuditStatus;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
};

export async function recordAuditEvent(
  input: RecordAuditEventInput,
  session?: ClientSession
) {
  await connectDB();

  return AuditEvent.create(
    [
      {
        requestId: input.requestId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        actorId: input.actorId || null,
        actorRole: input.actorRole || null,
        status: input.status,
        metadata: input.metadata || {},
        errorMessage: input.errorMessage || null,
      },
    ],
    session ? { session } : {}
  ).then(([event]) => event);
}

export async function recordAuditEventSafe(
  input: RecordAuditEventInput,
  session?: ClientSession
) {
  try {
    return await recordAuditEvent(input, session);
  } catch (error) {
    logError({
      message: "No se pudo registrar el evento de auditoria",
      context: "audit.service",
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
      },
      error,
    });

    return null;
  }
}

export async function listAuditEvents(limit = 50) {
  await connectDB();

  return AuditEvent.find()
    .populate("actorId", "fullname email role")
    .sort({ createdAt: -1 })
    .limit(limit);
}
