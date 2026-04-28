import { Types } from "mongoose";

type VariantIdentity = {
  varianteId?: string | null;
  color?: string | null;
  colorSecundario?: string | null;
  talla?: string | null;
};

type VariantLike = {
  varianteId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
};

export const createVariantId = () => new Types.ObjectId().toString();

export function ensureVariantIdentity<T extends { varianteId?: string }>(
  variant: T
): T & { varianteId: string } {
  return {
    ...variant,
    varianteId: variant.varianteId || createVariantId(),
  };
}

export function ensureVariantIdentities<T extends { varianteId?: string }>(
  variants: T[] = []
): Array<T & { varianteId: string }> {
  return variants.map(ensureVariantIdentity);
}

export function findVariantByIdentity<T extends VariantLike>(
  variants: T[] = [],
  identity: VariantIdentity
) {
  if (identity.varianteId) {
    const byId = variants.find((variant) => variant.varianteId === identity.varianteId);
    if (byId) {
      return byId;
    }
  }

  if (identity.color && identity.talla) {
    return variants.find(
      (variant) =>
        variant.color === identity.color &&
        variant.talla === identity.talla &&
        (identity.colorSecundario === undefined ||
          (variant.colorSecundario || "") === (identity.colorSecundario || ""))
    );
  }

  return undefined;
}
