import type { ClientSession } from "mongoose";
import { connectDB } from "@/libs/mongodb";
import AuditEvent from "@/models/eventoAuditoria";
import { logError } from "@/shared/observability/logger";

export type EstadoAuditoria = "SUCCESS" | "FAILED";
export type AuditActorRole = "ADMIN" | "VENDEDOR" | "CLIENTE" | "SYSTEM";

type RecordAuditEventInput = {
  requestId?: string | null;
  accion: string;
  tipoEntidad: string;
  idEntidad?: string | null;
  idActor?: string | null;
  rolActor?: AuditActorRole | null;
  estado: EstadoAuditoria;
  metadata?: Record<string, unknown>;
  mensajeError?: string | null;
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
        accion: input.accion,
        tipoEntidad: input.tipoEntidad,
        idEntidad: input.idEntidad || null,
        idActor: input.idActor || null,
        rolActor: input.rolActor || null,
        estado: input.estado,
        metadata: input.metadata || {},
        mensajeError: input.mensajeError || null,
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
        accion: input.accion,
        tipoEntidad: input.tipoEntidad,
        idEntidad: input.idEntidad || null,
      },
      error,
    });

    return null;
  }
}

export async function listAuditEvents(limit = 50) {
  await connectDB();

  return AuditEvent.find()
    .populate("idActor", "nombreCompleto email rol")
    .sort({ createdAt: -1 })
    .limit(limit);
}
