import { Schema, model, models, Types } from "mongoose";

const auditEventSchema = new Schema(
  {
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    actorId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["ADMIN", "VENDEDOR", "CLIENTE", "SYSTEM", null],
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

auditEventSchema.index({ action: 1, createdAt: -1 });
auditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditEventSchema.index({ actorId: 1, createdAt: -1 });

const AuditEvent = models.AuditEvent || model("AuditEvent", auditEventSchema);

export default AuditEvent;
