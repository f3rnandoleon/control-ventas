import AjustesSistema from "@/models/ajustesSistema";
import { UpdateAjustesInput } from "@/schemas/ajustes.schema";

const DEFAULT_KEY = "default";

export const ajustesRepository = {
  async findDefault() {
    return AjustesSistema.findOne({ key: DEFAULT_KEY }).lean();
  },

  async getOrCreateDefault() {
    let ajustes = await AjustesSistema.findOne({ key: DEFAULT_KEY });
    if (!ajustes) {
      ajustes = await AjustesSistema.create({ key: DEFAULT_KEY });
    }
    return ajustes.toObject();
  },

  async updateDefault(
    data: UpdateAjustesInput,
    updatedByUserId?: string
  ) {
    const updatePayload: Record<string, unknown> = {
      "finanzas.tipoCambioPEN_BOB": data.finanzas.tipoCambioPEN_BOB,
      "finanzas.ultimaActualizacionTipoCambio": new Date(),
      "politicas.devoluciones": data.politicas.devoluciones,
      "politicas.privacidad": data.politicas.privacidad,
      "politicas.terminos": data.politicas.terminos,
      "politicas.cookies": data.politicas.cookies,
    };

    if (updatedByUserId) {
      updatePayload["finanzas.actualizadoPor"] = updatedByUserId;
    }

    return AjustesSistema.findOneAndUpdate(
      { key: DEFAULT_KEY },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  },
};
