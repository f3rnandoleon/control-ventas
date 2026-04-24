import { Schema, model, models, Types } from "mongoose";

const eventoAuditoriaSchema = new Schema(
  {
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    accion: {
      type: String,
      required: true,
      index: true,
    },
    tipoEntidad: {
      type: String,
      required: true,
      index: true,
    },
    idEntidad: {
      type: String,
      default: null,
      index: true,
    },
    idActor: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    rolActor: {
      type: String,
      enum: ["ADMIN", "VENDEDOR", "CLIENTE", "SYSTEM", null],
      default: null,
      index: true,
    },
    estado: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    mensajeError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventoAuditoriaSchema.index({ accion: 1, createdAt: -1 });
eventoAuditoriaSchema.index({ tipoEntidad: 1, idEntidad: 1, createdAt: -1 });
eventoAuditoriaSchema.index({ idActor: 1, createdAt: -1 });

const EventoAuditoria = models.EventoAuditoria || model("EventoAuditoria", eventoAuditoriaSchema);

export default EventoAuditoria;
