import PerfilCliente from "@/models/perfilCliente";
import DireccionCliente from "@/models/direccionCliente";

export const clientesRepository = {
  findProfileByUserId(usuarioId: string) {
    return PerfilCliente.findOne({ usuarioId });
  },

  upsertProfileByUserId(usuarioId: string, payload: Record<string, unknown> = {}) {
    return PerfilCliente.findOneAndUpdate(
      { usuarioId },
      {
        $set: payload,
        $setOnInsert: { usuarioId },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  },

  listAddresses(perfilId: string) {
    return DireccionCliente.find({
      perfilClienteId: perfilId,
      estaActiva: true,
    }).sort({ esPredeterminada: -1, createdAt: -1 });
  },

  countActiveAddresses(perfilId: string) {
    return DireccionCliente.countDocuments({
      perfilClienteId: perfilId,
      estaActiva: true,
    });
  },

  findAddressById(perfilId: string, direccionId: string) {
    return DireccionCliente.findOne({
      _id: direccionId,
      perfilClienteId: perfilId,
    });
  },

  createAddress(payload: Record<string, unknown>) {
    return DireccionCliente.create(payload);
  },

  updateAddressById(
    perfilId: string,
    direccionId: string,
    payload: Record<string, unknown>
  ) {
    return DireccionCliente.findOneAndUpdate(
      { _id: direccionId, perfilClienteId: perfilId },
      { $set: payload },
      { new: true }
    );
  },

  unsetDefaultAddresses(perfilId: string, excludeId?: string) {
    return DireccionCliente.updateMany(
      {
        perfilClienteId: perfilId,
        estaActiva: true,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      },
      { $set: { esPredeterminada: false } }
    );
  },

  findDefaultAddress(perfilId: string) {
    return DireccionCliente.findOne({
      perfilClienteId: perfilId,
      estaActiva: true,
      esPredeterminada: true,
    });
  },

  findFirstActiveAddress(perfilId: string) {
    return DireccionCliente.findOne({
      perfilClienteId: perfilId,
      estaActiva: true,
    }).sort({ createdAt: 1 });
  },
};
