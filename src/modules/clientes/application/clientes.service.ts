import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import { clientesRepository } from "@/modules/clientes/infrastructure/clientes.repository";
import type {
  CrearDireccionClienteInput,
  ActualizarDireccionClienteInput,
  ActualizarPerfilClienteInput,
} from "@/schemas/cliente.schema";
import { AppError } from "@/shared/errors/AppError";

type SafeUser = {
  _id: mongoose.Types.ObjectId | string;
  nombreCompleto: string;
  email: string;
  rol: "ADMIN" | "VENDEDOR" | "CLIENTE";
  estaActivo: boolean;
  createdAt: Date;
  updatedAt: Date;
  ultimoAcceso?: Date;
};

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

async function getUserByIdOrThrow(usuarioId: string): Promise<SafeUser> {
  const user = await User.findById(usuarioId).select("-password").lean<SafeUser>();

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return user;
}

async function promoverDireccionPredeterminada(perfilId: string) {
  const currentDefault = await clientesRepository.findDefaultAddress(perfilId);
  if (currentDefault) {
    return currentDefault;
  }

  const firstActiveAddress =
    await clientesRepository.findFirstActiveAddress(perfilId);

  if (!firstActiveAddress) {
    return null;
  }

  return clientesRepository.updateAddressById(
    perfilId,
    firstActiveAddress._id.toString(),
    { esPredeterminada: true }
  );
}

export async function asegurarPerfilClienteParaUsuario(usuarioIdRaw: string) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(usuarioId, "Usuario no valido");

  await connectDB();

  const user = await getUserByIdOrThrow(usuarioId);
  const profile = await clientesRepository.upsertProfileByUserId(usuarioId);

  return { user, profile };
}

export async function obtenerContextoClientePorUsuario(
  usuarioIdRaw: string,
  options?: { ensureProfile?: boolean }
) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(usuarioId, "Usuario no valido");

  await connectDB();

  const user = await getUserByIdOrThrow(usuarioId);
  const shouldEnsureProfile = options?.ensureProfile ?? true;

  const profile = shouldEnsureProfile
    ? await clientesRepository.upsertProfileByUserId(usuarioId)
    : await clientesRepository.findProfileByUserId(usuarioId);

  const defaultAddress = profile
    ? await clientesRepository.findDefaultAddress(profile._id.toString())
    : null;

  return {
    user,
    profile,
    defaultAddress,
  };
}

export async function actualizarPerfilClientePorUsuario(
  usuarioIdRaw: string,
  payload: ActualizarPerfilClienteInput
) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(usuarioId, "Usuario no valido");

  await connectDB();

  await getUserByIdOrThrow(usuarioId);

  if (payload.nombreCompleto) {
    await User.findByIdAndUpdate(usuarioId, { nombreCompleto: payload.nombreCompleto });
  }

  const profilePayload = { ...payload };
  delete profilePayload.nombreCompleto;

  await clientesRepository.upsertProfileByUserId(usuarioId, profilePayload);

  return obtenerContextoClientePorUsuario(usuarioId, { ensureProfile: true });
}

export async function listarDireccionesClientePorUsuario(usuarioIdRaw: string) {
  const usuarioId = usuarioIdRaw.toString();
  const { profile } = await asegurarPerfilClienteParaUsuario(usuarioId);

  return clientesRepository.listAddresses(profile._id.toString());
}

export async function crearDireccionClientePorUsuario(
  usuarioIdRaw: string,
  payload: CrearDireccionClienteInput
) {
  const usuarioId = usuarioIdRaw.toString();
  const { profile } = await asegurarPerfilClienteParaUsuario(usuarioId);
  const perfilId = profile._id.toString();
  const activeAddressCount =
    await clientesRepository.countActiveAddresses(perfilId);
  const esPredeterminada = payload.esPredeterminada === true || activeAddressCount === 0;

  if (esPredeterminada) {
    await clientesRepository.unsetDefaultAddresses(perfilId);
  }

  return clientesRepository.createAddress({
    perfilClienteId: perfilId,
    etiqueta: payload.etiqueta,
    nombreDestinatario: payload.nombreDestinatario,
    telefono: payload.telefono,
    departamento: payload.departamento,
    ciudad: payload.ciudad,
    zona: payload.zona ?? null,
    direccion: payload.direccion,
    referencia: payload.referencia ?? null,
    codigoPostal: payload.codigoPostal ?? null,
    pais: payload.pais || "Bolivia",
    esPredeterminada,
    estaActiva: true,
  });
}

export async function actualizarDireccionClientePorUsuario(
  usuarioIdRaw: string,
  direccionId: string,
  payload: ActualizarDireccionClienteInput
) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(direccionId, "Direccion invalida");

  const { profile } = await asegurarPerfilClienteParaUsuario(usuarioId);
  const perfilId = profile._id.toString();

  const address = await clientesRepository.findAddressById(perfilId, direccionId);

  if (!address || !address.estaActiva) {
    throw new AppError("Direccion no encontrada", 404);
  }

  if (payload.esPredeterminada === true) {
    await clientesRepository.unsetDefaultAddresses(perfilId, direccionId);
  }

  const updatedAddress = await clientesRepository.updateAddressById(
    perfilId,
    direccionId,
    {
      ...payload,
      ...(payload.zona === undefined ? {} : { zona: payload.zona ?? null }),
      ...(payload.referencia === undefined
        ? {}
        : { referencia: payload.referencia ?? null }),
      ...(payload.codigoPostal === undefined
        ? {}
        : { codigoPostal: payload.codigoPostal ?? null }),
      ...(payload.pais === undefined ? {} : { pais: payload.pais }),
    }
  );

  if (!updatedAddress) {
    throw new AppError("Direccion no encontrada", 404);
  }

  await promoverDireccionPredeterminada(perfilId);

  return clientesRepository.findAddressById(perfilId, direccionId);
}

export async function eliminarDireccionClientePorUsuario(
  usuarioIdRaw: string,
  direccionId: string
) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(direccionId, "Direccion invalida");

  const { profile } = await asegurarPerfilClienteParaUsuario(usuarioId);
  const perfilId = profile._id.toString();
  const address = await clientesRepository.findAddressById(perfilId, direccionId);

  if (!address || !address.estaActiva) {
    throw new AppError("Direccion no encontrada", 404);
  }

  await clientesRepository.updateAddressById(perfilId, direccionId, {
    estaActiva: false,
    esPredeterminada: false,
  });

  await promoverDireccionPredeterminada(perfilId);

  return { message: "Direccion eliminada correctamente" };
}

export async function obtenerDireccionClientePorUsuario(
  usuarioIdRaw: string,
  direccionId: string
) {
  const usuarioId = usuarioIdRaw.toString();
  assertObjectId(direccionId, "Direccion invalida");

  const { profile } = await asegurarPerfilClienteParaUsuario(usuarioId);
  const perfilId = profile._id.toString();
  const address = await clientesRepository.findAddressById(perfilId, direccionId);

  if (!address || !address.estaActiva) {
    throw new AppError("Direccion no encontrada", 404);
  }

  return address;
}
