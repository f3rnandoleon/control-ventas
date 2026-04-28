import Producto from "@/models/producto";

export const catalogRepository = {
  listAll() {
    return Producto.find().sort({ createdAt: -1 }).lean();
  },

  listPublic(projection: Record<string, 0 | 1>) {
    return Producto.find(
      { estado: { $ne: "INACTIVO" } },
      projection
    ).sort({ createdAt: -1 });
  },

  findById(id: string) {
    return Producto.findById(id);
  },

  findPublicById(id: string, projection: Record<string, 0 | 1>) {
    return Producto.findOne(
      { _id: id, estado: { $ne: "INACTIVO" } },
      projection
    );
  },

  findBySku(sku: string) {
    return Producto.findOne({ sku });
  },

  findBySkuExcludingId(sku: string, id: string) {
    return Producto.findOne({ sku, _id: { $ne: id } });
  },

  create(payload: Record<string, unknown>) {
    return Producto.create(payload);
  },

  updateById(id: string, payload: Record<string, unknown>) {
    return Producto.findByIdAndUpdate(id, payload, { new: true });
  },

  deleteById(id: string) {
    return Producto.findByIdAndDelete(id);
  },

  findByVariantCode(code: string) {
    return Producto.findOne({
      $or: [{ "variantes.codigoBarra": code }, { "variantes.qrCode": code }],
    });
  },
};
