import { Schema, model, models, Types } from "mongoose";

const ajustesSistemaSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: "default",
    },

    // 💱 Configuración Financiera y Cambiaria
    finanzas: {
      tipoCambioPEN_BOB: {
        type: Number,
        required: true,
        default: 2.10,
        min: 0.01,
      },
      monedaPrincipal: {
        type: String,
        default: "BOB",
        immutable: true,
      },
      ultimaActualizacionTipoCambio: {
        type: Date,
        default: Date.now,
      },
      actualizadoPor: {
        type: Types.ObjectId,
        ref: "User",
      },
    },

    // ⚖️ Políticas Legales para la Tienda Web
    politicas: {
      devoluciones: {
        titulo: { type: String, default: "Políticas de Devolución y Cambios" },
        contenido: {
          type: String,
          default:
            "## Política de Devoluciones y Cambios\n\nEn **Fit Andes** valoramos tu satisfacción con cada prenda adquirida.\n\n### Plazos y Condiciones\n- Los cambios o devoluciones pueden solicitarse dentro del plazo estipulado desde la recepción del producto.\n- La prenda debe encontrarse sin uso, sin lavar, con etiquetas originales intactas y en su empaque original.\n- Es necesario presentar el comprobante de compra o número de pedido.\n\n### Proceso de Devolución\n1. Contáctanos a través de nuestros canales oficiales con tu número de pedido.\n2. Coordina el envío o entrega en nuestro punto habilitado.\n3. Una vez verificado el estado de la prenda, se procederá al cambio o reembolso correspondiente.",
        },
        version: { type: String, default: "1.0" },
        activo: { type: Boolean, default: true },
        ultimaActualizacion: { type: Date, default: Date.now },
        diasLimiteDevolucion: { type: Number, default: 7, min: 1 },
      },
      privacidad: {
        titulo: { type: String, default: "Política de Privacidad" },
        contenido: {
          type: String,
          default:
            "## Política de Privacidad\n\nEn **Fit Andes** nos comprometemos a proteger la privacidad y seguridad de los datos personales de nuestros clientes.\n\n### Información que recopilamos\n- Datos de contacto: nombre, teléfono, dirección de entrega y correo electrónico.\n- Información de pedidos y transacciones para la gestión de envíos.\n\n### Uso de la información\n- Procesar y despachar tus pedidos.\n- Notificaciones sobre el estado de entrega.\n- Mejorar la experiencia de usuario y atención al cliente.\n\nNo compartimos tus datos personales con terceros para fines comerciales.",
        },
        version: { type: String, default: "1.0" },
        activo: { type: Boolean, default: true },
        ultimaActualizacion: { type: Date, default: Date.now },
      },
      terminos: {
        titulo: { type: String, default: "Términos y Condiciones" },
        contenido: {
          type: String,
          default:
            "## Términos y Condiciones de Uso\n\nBienvenido a la tienda en línea de **Fit Andes**. Al realizar una compra en nuestra plataforma, aceptas los presentes términos y condiciones.\n\n### Disponibilidad y Precios\n- Todos los precios están expresados en Bolivianos (Bs).\n- El stock de productos está sujeto a disponibilidad y confirmación.\n- Nos reservamos el derecho de actualizar precios y catálogo sin previo aviso.\n\n### Entregas y Envíos\n- Los envíos se realizan según los métodos y horarios acordados en el proceso de compra.\n- El cliente es responsable de proporcionar información de entrega exacta.",
        },
        version: { type: String, default: "1.0" },
        activo: { type: Boolean, default: true },
        ultimaActualizacion: { type: Date, default: Date.now },
      },
      cookies: {
        titulo: { type: String, default: "Política de Cookies" },
        contenido: {
          type: String,
          default:
            "## Uso de Cookies\n\nUtilizamos cookies esenciales y de análisis para garantizar el correcto funcionamiento de nuestra tienda en línea, recordar tus preferencias de navegación y optimizar el rendimiento del sitio.\n\nPuedes administrar o desactivar las cookies en la configuración de tu navegador.",
        },
        version: { type: String, default: "1.0" },
        activo: { type: Boolean, default: true },
        ultimaActualizacion: { type: Date, default: Date.now },
        mostrarBanner: { type: Boolean, default: true },
        mensajeBanner: {
          type: String,
          default:
            "Utilizamos cookies para garantizar la mejor experiencia en nuestra tienda online. Al continuar navegando aceptas su uso.",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

const AjustesSistema =
  models.AjustesSistema || model("AjustesSistema", ajustesSistemaSchema);

export default AjustesSistema;
