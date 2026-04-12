import { Types } from "mongoose";

type VariantIdentity = {
  variantId?: string | null;
  color?: string | null;
  colorSecundario?: string | null;
  talla?: string | null;
};

type VariantLike = {
  variantId?: string;
  color: string;
  colorSecundario?: string;
  talla: string;
};

export const createVariantId = () => new Types.ObjectId().toString();

export function ensureVariantIdentity<T extends { variantId?: string }>(
  variant: T
): T & { variantId: string } {
  return {
    ...variant,
    variantId: variant.variantId || createVariantId(),
  };
}

export function ensureVariantIdentities<T extends { variantId?: string }>(
  variants: T[] = []
): Array<T & { variantId: string }> {
  return variants.map(ensureVariantIdentity);
}

export function findVariantByIdentity<T extends VariantLike>(
  variants: T[] = [],
  identity: VariantIdentity
) {
  if (identity.variantId) {
    const byId = variants.find((variant) => variant.variantId === identity.variantId);
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
