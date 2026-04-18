export type PaymentTransactionStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface PaymentTransaction {
  _id: string;
  paymentNumber: string;
  orderId: string;
  customer?: string | null;
  metodoPago: "EFECTIVO" | "QR";
  amount: number;
  status: PaymentTransactionStatus;
  idempotencyKey?: string | null;
  externalReference?: string | null;
  failureReason?: string | null;
  confirmedAt?: string | null;
  failedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
