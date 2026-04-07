import mongoose from "mongoose";
import { connectDB } from "@/libs/mongodb";
import User from "@/models/user";
import { customersRepository } from "@/modules/customers/infrastructure/customers.repository";
import type {
  CreateCustomerAddressInput,
  UpdateCustomerAddressInput,
  UpdateCustomerProfileInput,
} from "@/schemas/customer.schema";
import { AppError } from "@/shared/errors/AppError";

type SafeUser = {
  _id: mongoose.Types.ObjectId | string;
  fullname: string;
  email: string;
  role: "ADMIN" | "VENDEDOR" | "CLIENTE";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
};

function assertObjectId(value: string, message: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(message, 400);
  }
}

async function getUserByIdOrThrow(userId: string): Promise<SafeUser> {
  const user = await User.findById(userId).select("-password").lean<SafeUser>();

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return user;
}

async function promoteFallbackDefaultAddress(profileId: string) {
  const currentDefault = await customersRepository.findDefaultAddress(profileId);
  if (currentDefault) {
    return currentDefault;
  }

  const firstActiveAddress =
    await customersRepository.findFirstActiveAddress(profileId);

  if (!firstActiveAddress) {
    return null;
  }

  return customersRepository.updateAddressById(
    profileId,
    firstActiveAddress._id.toString(),
    { isDefault: true }
  );
}

export async function ensureCustomerProfileForUser(userIdRaw: string) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");

  await connectDB();

  const user = await getUserByIdOrThrow(userId);
  const profile = await customersRepository.upsertProfileByUserId(userId);

  return { user, profile };
}

export async function getCustomerContextByUserId(
  userIdRaw: string,
  options?: { ensureProfile?: boolean }
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");

  await connectDB();

  const user = await getUserByIdOrThrow(userId);
  const shouldEnsureProfile = options?.ensureProfile ?? true;

  const profile = shouldEnsureProfile
    ? await customersRepository.upsertProfileByUserId(userId)
    : await customersRepository.findProfileByUserId(userId);

  const defaultAddress = profile
    ? await customersRepository.findDefaultAddress(profile._id.toString())
    : null;

  return {
    user,
    profile,
    defaultAddress,
  };
}

export async function updateCustomerProfileByUserId(
  userIdRaw: string,
  payload: UpdateCustomerProfileInput
) {
  const userId = userIdRaw.toString();
  assertObjectId(userId, "Usuario no valido");

  await connectDB();

  await getUserByIdOrThrow(userId);

  if (payload.fullname) {
    await User.findByIdAndUpdate(userId, { fullname: payload.fullname });
  }

  const profilePayload = { ...payload };
  delete profilePayload.fullname;

  await customersRepository.upsertProfileByUserId(userId, profilePayload);

  return getCustomerContextByUserId(userId, { ensureProfile: true });
}

export async function listCustomerAddressesByUserId(userIdRaw: string) {
  const userId = userIdRaw.toString();
  const { profile } = await ensureCustomerProfileForUser(userId);

  return customersRepository.listAddresses(profile._id.toString());
}

export async function createCustomerAddressByUserId(
  userIdRaw: string,
  payload: CreateCustomerAddressInput
) {
  const userId = userIdRaw.toString();
  const { profile } = await ensureCustomerProfileForUser(userId);
  const profileId = profile._id.toString();
  const activeAddressCount =
    await customersRepository.countActiveAddresses(profileId);
  const isDefault = payload.isDefault === true || activeAddressCount === 0;

  if (isDefault) {
    await customersRepository.unsetDefaultAddresses(profileId);
  }

  return customersRepository.createAddress({
    customerProfileId: profileId,
    label: payload.label,
    recipientName: payload.recipientName,
    phone: payload.phone,
    department: payload.department,
    city: payload.city,
    zone: payload.zone ?? null,
    addressLine: payload.addressLine,
    reference: payload.reference ?? null,
    postalCode: payload.postalCode ?? null,
    country: payload.country || "Bolivia",
    isDefault,
    isActive: true,
  });
}

export async function updateCustomerAddressByUserId(
  userIdRaw: string,
  addressId: string,
  payload: UpdateCustomerAddressInput
) {
  const userId = userIdRaw.toString();
  assertObjectId(addressId, "Direccion invalida");

  const { profile } = await ensureCustomerProfileForUser(userId);
  const profileId = profile._id.toString();

  const address = await customersRepository.findAddressById(profileId, addressId);

  if (!address || !address.isActive) {
    throw new AppError("Direccion no encontrada", 404);
  }

  if (payload.isDefault === true) {
    await customersRepository.unsetDefaultAddresses(profileId, addressId);
  }

  const updatedAddress = await customersRepository.updateAddressById(
    profileId,
    addressId,
    {
      ...payload,
      ...(payload.zone === undefined ? {} : { zone: payload.zone ?? null }),
      ...(payload.reference === undefined
        ? {}
        : { reference: payload.reference ?? null }),
      ...(payload.postalCode === undefined
        ? {}
        : { postalCode: payload.postalCode ?? null }),
      ...(payload.country === undefined ? {} : { country: payload.country }),
    }
  );

  if (!updatedAddress) {
    throw new AppError("Direccion no encontrada", 404);
  }

  await promoteFallbackDefaultAddress(profileId);

  return customersRepository.findAddressById(profileId, addressId);
}

export async function deleteCustomerAddressByUserId(
  userIdRaw: string,
  addressId: string
) {
  const userId = userIdRaw.toString();
  assertObjectId(addressId, "Direccion invalida");

  const { profile } = await ensureCustomerProfileForUser(userId);
  const profileId = profile._id.toString();
  const address = await customersRepository.findAddressById(profileId, addressId);

  if (!address || !address.isActive) {
    throw new AppError("Direccion no encontrada", 404);
  }

  await customersRepository.updateAddressById(profileId, addressId, {
    isActive: false,
    isDefault: false,
  });

  await promoteFallbackDefaultAddress(profileId);

  return { message: "Direccion eliminada correctamente" };
}

export async function getCustomerAddressByUserId(
  userIdRaw: string,
  addressId: string
) {
  const userId = userIdRaw.toString();
  assertObjectId(addressId, "Direccion invalida");

  const { profile } = await ensureCustomerProfileForUser(userId);
  const profileId = profile._id.toString();
  const address = await customersRepository.findAddressById(profileId, addressId);

  if (!address || !address.isActive) {
    throw new AppError("Direccion no encontrada", 404);
  }

  return address;
}
