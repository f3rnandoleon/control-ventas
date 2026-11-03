import { Schema, model, models } from "mongoose";
import { tipoSucursalValues } from "@/types/sucursal";

const sucursalSchema = new Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la sucursal es obligatorio"],
      trim: true,
    },
    codigo: {
      type: String,
      required: [true, "El código de la sucursal es obligatorio"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    tipo: {
      type: String,
      enum: tipoSucursalValues,
      default: "TIENDA_FISICA",
      required: true,
    },
    direccion: {
      type: String,
      trim: true,
    },
    ciudad: {
      type: String,
      default: "La Paz",
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    ubicacionMapa: {
      googleMapsUrl: {
        type: String,
        trim: true,
      },
      embedUrl: {
        type: String,
        trim: true,
      },
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      referencia: {
        type: String,
        trim: true,
      },
      horariosTexto: {
        type: String,
        trim: true,
      },
    },
    visibleEnWebYAgente: {
      type: Boolean,
      default: true,
    },
    permiteVentaPOS: {
      type: Boolean,
      default: true,
    },
    permiteDespachoWeb: {
      type: Boolean,
      default: false,
    },
    permiteRetiroCliente: {
      type: Boolean,
      default: false,
    },
    requiereAperturaCaja: {
      type: Boolean,
      default: true,
    },
    activa: {
      type: Boolean,
      default: true,
    },
    esAlmacenPrincipal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

sucursalSchema.index({ activa: 1, tipo: 1 });
sucursalSchema.index({ esAlmacenPrincipal: 1 });

const Sucursal = models.Sucursal || model("Sucursal", sucursalSchema);

export default Sucursal;
