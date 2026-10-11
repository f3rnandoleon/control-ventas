import { connectDB } from "@/libs/mongodb";
import { recordAuditEventSafe } from "@/modules/audit/application/audit.service";
import { ajustesRepository } from "@/modules/ajustes/infrastructure/ajustes.repository";
import { UpdateAjustesInput } from "@/schemas/ajustes.schema";
import { AjustesSistemaDTO, PublicPoliticasResponse } from "@/types/ajustes";
import { AppError } from "@/shared/errors/AppError";

export const DEFAULT_POLITICAS: PublicPoliticasResponse = {
  devoluciones: {
    titulo: "Políticas de Devolución y Cambios",
    contenido:
      "## Política de Devoluciones y Cambios\n\nEn **Fit Andes** valoramos tu satisfacción con cada prenda adquirida.\n\n### Plazos y Condiciones\n- Los cambios o devoluciones pueden solicitarse dentro del plazo estipulado desde la recepción del producto.\n- La prenda debe encontrarse sin uso, sin lavar, con etiquetas originales intactas y en su empaque original.\n- Es necesario presentar el comprobante de compra o número de pedido.\n\n### Proceso de Devolución\n1. Contáctanos a través de nuestros canales oficiales con tu número de pedido.\n2. Coordina el envío o entrega en nuestro punto habilitado.\n3. Una vez verificado el estado de la prenda, se procederá al cambio o reembolso correspondiente.",
    version: "1.0",
    activo: true,
    diasLimiteDevolucion: 7,
  },
  privacidad: {
    titulo: "Política de Privacidad",
    contenido:
      "## Política de Privacidad\n\nEn **Fit Andes** nos comprometemos a proteger la privacidad y seguridad de los datos personales de nuestros clientes.\n\n### Información que recopilamos\n- Datos de contacto: nombre, teléfono, dirección de entrega y correo electrónico.\n- Información de pedidos y transacciones para la gestión de envíos.\n\n### Uso de la información\n- Procesar y despachar tus pedidos.\n- Notificaciones sobre el estado de entrega.\n- Mejorar la experiencia de usuario y atención al cliente.\n\nNo compartimos tus datos personales con terceros para fines comerciales.",
    version: "1.0",
    activo: true,
  },
  terminos: {
    titulo: "Términos y Condiciones",
    contenido:
      "## Términos y Condiciones de Uso\n\nBienvenido a la tienda en línea de **Fit Andes**. Al realizar una compra en nuestra plataforma, aceptas los presentes términos y condiciones.\n\n### Disponibilidad y Precios\n- Todos los precios están expresados en Bolivianos (Bs).\n- El stock de productos está sujeto a disponibilidad y confirmación.\n- Nos reservamos el derecho de actualizar precios y catálogo sin previo aviso.\n\n### Entregas y Envíos\n- Los envíos se realizan según los métodos y horarios acordados en el proceso de compra.\n- El cliente es responsable de proporcionar información de entrega exacta.",
    version: "1.0",
    activo: true,
  },
  cookies: {
    titulo: "Política de Cookies",
    contenido:
      "## Uso de Cookies\n\nUtilizamos cookies esenciales y de análisis para garantizar el correcto funcionamiento de nuestra tienda en línea, recordar tus preferencias de navegación y optimizar el rendimiento del sitio.\n\nPuedes administrar o desactivar las cookies en la configuración de tu navegador.",
    version: "1.0",
    activo: true,
    mostrarBanner: true,
    mensajeBanner:
      "Utilizamos cookies para garantizar la mejor experiencia en nuestra tienda online. Al continuar navegando aceptas su uso.",
  },
};

export async function getAjustes(): Promise<AjustesSistemaDTO> {
  await connectDB();
  const ajustes = await ajustesRepository.getOrCreateDefault();
  return ajustes as unknown as AjustesSistemaDTO;
}

export async function getTipoCambioVigente(): Promise<number> {
  try {
    await connectDB();
    const ajustes = await ajustesRepository.getOrCreateDefault();
    return (ajustes as unknown as AjustesSistemaDTO).finanzas?.tipoCambioPEN_BOB || 2.10;
  } catch (err) {
    console.warn("No se pudo conectar a MongoDB para tipo de cambio, usando default 2.10:", err);
    return 2.10;
  }
}

export async function getPoliticasPublicas(): Promise<PublicPoliticasResponse> {
  try {
    await connectDB();
    const ajustes = (await ajustesRepository.getOrCreateDefault()) as unknown as AjustesSistemaDTO;

    if (!ajustes?.politicas) {
      return DEFAULT_POLITICAS;
    }

    return {
      devoluciones: ajustes.politicas.devoluciones || DEFAULT_POLITICAS.devoluciones,
      privacidad: ajustes.politicas.privacidad || DEFAULT_POLITICAS.privacidad,
      terminos: ajustes.politicas.terminos || DEFAULT_POLITICAS.terminos,
      cookies: ajustes.politicas.cookies || DEFAULT_POLITICAS.cookies,
    };
  } catch (err) {
    console.warn("MongoDB no disponible al consultar políticas públicas. Retornando políticas por defecto:", err);
    return DEFAULT_POLITICAS;
  }
}

export async function updateAjustes(
  input: UpdateAjustesInput,
  actor: { id: string; rol: "ADMIN" }
): Promise<AjustesSistemaDTO> {
  await connectDB();

  const previous = (await ajustesRepository.findDefault()) as unknown as AjustesSistemaDTO | null;
  const updated = (await ajustesRepository.updateDefault(
    input,
    actor.id
  )) as unknown as AjustesSistemaDTO;

  if (!updated) {
    throw new AppError("No se pudieron guardar los ajustes del sistema", 500);
  }

  await recordAuditEventSafe({
    accion: "SYSTEM_SETTINGS_UPDATED",
    tipoEntidad: "AJUSTES_SISTEMA",
    idEntidad: updated._id?.toString() || "default",
    idActor: actor.id,
    rolActor: actor.rol,
    estado: "SUCCESS",
    metadata: {
      tipoCambioAnterior: previous?.finanzas?.tipoCambioPEN_BOB,
      tipoCambioNuevo: input.finanzas.tipoCambioPEN_BOB,
    },
  });

  return updated;
}
