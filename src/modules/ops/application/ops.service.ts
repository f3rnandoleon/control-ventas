import Producto from "@/models/product";
import Order from "@/models/order";
import PaymentTransaction from "@/models/paymentTransaction";
import { getMongoRuntimeInfo } from "@/libs/mongodb";
import { listAuditEvents } from "@/modules/audit/application/audit.service";
import { getLegacyMigrationStatus } from "@/modules/migrations/application/legacy-migration.service";

type OpsAlertSeverity = "info" | "warning" | "critical";

type BackupStatus = {
  enabled: boolean;
  provider: string | null;
  target: string | null;
  retentionDays: number | null;
  lastBackupAt: string | null;
  maxAgeHours: number;
  stale: boolean;
};

function toPositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getBackupStatus(): BackupStatus {
  const enabled = process.env.BACKUP_ENABLED === "true";
  const provider = process.env.BACKUP_PROVIDER || null;
  const target = process.env.BACKUP_TARGET || null;
  const retentionDays = process.env.BACKUP_RETENTION_DAYS
    ? Number(process.env.BACKUP_RETENTION_DAYS)
    : null;
  const lastBackupAt = process.env.LAST_BACKUP_AT || null;
  const maxAgeHours = toPositiveNumber(process.env.BACKUP_MAX_AGE_HOURS, 24);
  const stale =
    enabled &&
    (!lastBackupAt ||
      Date.now() - new Date(lastBackupAt).getTime() > maxAgeHours * 60 * 60 * 1000);

  return {
    enabled,
    provider,
    target,
    retentionDays:
      retentionDays && Number.isFinite(retentionDays) ? retentionDays : null,
    lastBackupAt,
    maxAgeHours,
    stale,
  };
}

function buildAlert(
  severity: OpsAlertSeverity,
  code: string,
  message: string,
  data?: Record<string, unknown>
) {
  return {
    severity,
    code,
    message,
    ...(data ? { data } : {}),
  };
}

export async function getOpsOverview() {
  const runtime = await getMongoRuntimeInfo({ refresh: true });
  const backup = getBackupStatus();
  const legacy = await getLegacyMigrationStatus();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    staleReservations,
    paidOrdersWithoutFulfillment,
    failedPaymentsLast24h,
    refundedPaymentsLast24h,
    productsWithInvalidReservedStock,
    recentAuditEvents,
  ] = await Promise.all([
    Order.countDocuments({
      stockReservationStatus: "RESERVED",
      reservationExpiresAt: { $lt: now },
    }),
    Order.countDocuments({
      paymentStatus: "PAID",
      fulfillmentStatus: { $in: ["PENDING", "READY", "IN_TRANSIT"] },
      channel: { $in: ["WEB", "APP_QR"] },
    }),
    PaymentTransaction.countDocuments({
      status: "FAILED",
      createdAt: { $gte: twentyFourHoursAgo },
    }),
    PaymentTransaction.countDocuments({
      status: "REFUNDED",
      createdAt: { $gte: twentyFourHoursAgo },
    }),
    Producto.aggregate([
      { $unwind: "$variantes" },
      {
        $match: {
          $expr: {
            $gt: ["$variantes.reservedStock", "$variantes.stock"],
          },
        },
      },
      { $count: "count" },
    ]).then((result) => result[0]?.count ?? 0),
    listAuditEvents(20),
  ]);

  const alerts = [];

  if (!runtime.transactionsSupported) {
    alerts.push(
      buildAlert(
        "critical",
        "MONGO_TRANSACTIONS_UNAVAILABLE",
        "MongoDB no soporta transacciones. Los flujos criticos no deben ejecutarse en este estado.",
        { topology: runtime.topology }
      )
    );
  }

  if (!backup.enabled) {
    alerts.push(
      buildAlert(
        "critical",
        "BACKUP_DISABLED",
        "No hay respaldo automatico declarado en la configuracion operativa."
      )
    );
  } else if (backup.stale) {
    alerts.push(
      buildAlert(
        "critical",
        "BACKUP_STALE",
        "El ultimo backup reportado esta vencido segun la politica configurada.",
        {
          lastBackupAt: backup.lastBackupAt,
          maxAgeHours: backup.maxAgeHours,
        }
      )
    );
  }

  if (legacy.pendingBackfill.salesWithoutOrder > 0) {
    alerts.push(
      buildAlert(
        "warning",
        "LEGACY_BACKFILL_PENDING",
        "Aun existen ventas legacy sin Order migrado; el fallback sigue siendo necesario.",
        {
          salesWithoutOrder: legacy.pendingBackfill.salesWithoutOrder,
        }
      )
    );
  }

  if (staleReservations > 0) {
    alerts.push(
      buildAlert(
        "critical",
        "STALE_STOCK_RESERVATIONS",
        "Existen pedidos con reservas expiradas aun marcadas como activas.",
        { staleReservations }
      )
    );
  }

  if (productsWithInvalidReservedStock > 0) {
    alerts.push(
      buildAlert(
        "critical",
        "INVALID_RESERVED_STOCK",
        "Hay variantes con reservedStock mayor al stock fisico.",
        { productsWithInvalidReservedStock }
      )
    );
  }

  if (failedPaymentsLast24h > 5) {
    alerts.push(
      buildAlert(
        "warning",
        "FAILED_PAYMENTS_SPIKE",
        "Se detecto un volumen alto de pagos fallidos en las ultimas 24 horas.",
        { failedPaymentsLast24h }
      )
    );
  }

  return {
    timestamp: now.toISOString(),
    runtime,
    backup,
    legacy,
    metrics: {
      staleReservations,
      paidOrdersWithoutFulfillment,
      failedPaymentsLast24h,
      refundedPaymentsLast24h,
      productsWithInvalidReservedStock,
    },
    alerts,
    recentAuditEvents,
  };
}
