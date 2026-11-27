import { createHash, timingSafeEqual } from "crypto";

/**
 * Configuración temporal y reversible para Checkout Express de Promoción.
 * Todos los valores tienen defaults seguros para volver al flujo normal
 * simplemente apagando o eliminando las variables de entorno.
 */

const DEFAULT_WEB_RESERVATION_MINUTES = 30;
const DEFAULT_WEB_RESERVATION_GRACE_SECONDS = 0;
const DEFAULT_NATIONAL_SHIPPING_FLAT_FEE = 10;
const DEFAULT_MAX_ACTIVE_RESERVATIONS_PER_CUSTOMER = 3;

const LA_PAZ_ALIASES = new Set(["la paz", "lapaz", "lp", "lpz"]);

const NATIONAL_DEPARTMENTS_MAP: Record<string, string> = {
  oruro: "Oruro",
  potosi: "Potosí",
  cochabamba: "Cochabamba",
  sucre: "Sucre",
  chuquisaca: "Chuquisaca",
  tarija: "Tarija",
  pando: "Pando",
  beni: "Beni",
  "santa cruz": "Santa Cruz",
  santacruz: "Santa Cruz",
};

function parsePositiveIntEnv(
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(parsed, max);
}

function parseNonNegativeNumberEnv(
  rawValue: string | undefined,
  fallback: number,
  max: number
): number {
  if (rawValue === undefined || rawValue === null || rawValue.trim() === "") {
    return fallback;
  }
  const parsed = Number(rawValue.trim());
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.round(parsed * 100) / 100, max);
}

export function isPromoExpressCheckoutEnabled(): boolean {
  const raw = (process.env.WEB_PROMO_EXPRESS_CHECKOUT || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getWebReservationMinutes(): number {
  return parsePositiveIntEnv(
    process.env.WEB_RESERVATION_MINUTES,
    DEFAULT_WEB_RESERVATION_MINUTES,
    1,
    60 * 48
  );
}

export function getWebReservationGraceSeconds(): number {
  return parsePositiveIntEnv(
    process.env.WEB_RESERVATION_GRACE_SECONDS,
    DEFAULT_WEB_RESERVATION_GRACE_SECONDS,
    0,
    600
  );
}

export function getNationalShippingFlatFee(): number {
  return parseNonNegativeNumberEnv(
    process.env.NATIONAL_SHIPPING_FLAT_FEE,
    DEFAULT_NATIONAL_SHIPPING_FLAT_FEE,
    1000
  );
}

export function getMaxActiveReservationsPerCustomer(): number {
  return parsePositiveIntEnv(
    process.env.MAX_ACTIVE_RESERVATIONS_PER_CUSTOMER,
    DEFAULT_MAX_ACTIVE_RESERVATIONS_PER_CUSTOMER,
    1,
    50
  );
}

export function normalizeDepartmentText(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export type ResolvedShippingDepartment = {
  isLaPaz: boolean;
  isNational: boolean;
  canonicalName: string | null;
};

export function resolveShippingDepartment(
  rawDepartment?: string | null
): ResolvedShippingDepartment {
  const normalized = normalizeDepartmentText(rawDepartment);
  if (!normalized) {
    return { isLaPaz: false, isNational: false, canonicalName: null };
  }

  if (LA_PAZ_ALIASES.has(normalized)) {
    return { isLaPaz: true, isNational: false, canonicalName: "La Paz" };
  }

  const matchedNational = NATIONAL_DEPARTMENTS_MAP[normalized];
  if (matchedNational) {
    return { isLaPaz: false, isNational: true, canonicalName: matchedNational };
  }

  return {
    isLaPaz: false,
    isNational: false,
    canonicalName: rawDepartment?.trim() || null,
  };
}

export function resolveCheckoutShippingFee(params: {
  metodoEntrega?: string | null;
  departamento?: string | null;
}): {
  costoEnvio: number;
  department: ResolvedShippingDepartment;
} {
  const department = resolveShippingDepartment(params.departamento);

  if (params.metodoEntrega === "SHIPPING_NATIONAL") {
    if (department.isLaPaz) {
      return { costoEnvio: 0, department };
    }
    return { costoEnvio: getNationalShippingFlatFee(), department };
  }

  if (department.isNational) {
    return { costoEnvio: getNationalShippingFlatFee(), department };
  }

  return { costoEnvio: 0, department };
}

export function hashReservationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function verifyReservationToken(
  token: string | null | undefined,
  expectedHash: string | null | undefined
): boolean {
  if (!token || !expectedHash) return false;
  const candidateHash = hashReservationToken(token);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
