// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  USER     = 'USER',
  MERCHANT = 'MERCHANT',
  ADMIN    = 'ADMIN',
}

export enum KycStatus {
  PENDING  = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum OrderStatus {
  CREATED                   = 'CREATED',
  MATCHED                   = 'MATCHED',
  ESCROW_LOCKED             = 'ESCROW_LOCKED',
  PAYMENT_PENDING           = 'PAYMENT_PENDING',
  PAID_MARKED               = 'PAID_MARKED',
  PAYMENT_CONFIRMED         = 'PAYMENT_CONFIRMED',
  COMPLETED                 = 'COMPLETED',
  DISPUTE                   = 'DISPUTE',
  CANCELLED                 = 'CANCELLED',
  REFUNDED                  = 'REFUNDED',
  /** Scan & Pay: merchant has paid the fiat receiver, waiting user confirmation */
  SCAN_PAY_MERCHANT_PAID    = 'SCAN_PAY_MERCHANT_PAID',
  /** Scan & Pay: matched merchant has explicitly accepted the job */
  MERCHANT_ACCEPTED         = 'MERCHANT_ACCEPTED',
  /** Scan & Pay: user has submitted the receiver’s UPI/QR after merchant accepted */
  RECEIVER_SUBMITTED        = 'RECEIVER_SUBMITTED',
}

export enum OrderType {
  BUY      = 'BUY',
  SELL     = 'SELL',
  SCAN_PAY = 'SCAN_PAY',
}

export enum CryptoAsset {
  ETH  = 'ETH',
}

export enum PaymentMethod {
  UPI          = 'UPI',
  IMPS         = 'IMPS',
  NEFT         = 'NEFT',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum EscrowStatus {
  PENDING  = 'PENDING',
  LOCKED   = 'LOCKED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

export enum DisputeStatus {
  PENDING      = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED     = 'RESOLVED',
}

export enum DisputeResolution {
  RELEASE_TO_USER    = 'RELEASE_TO_USER',
  REFUND_TO_MERCHANT = 'REFUND_TO_MERCHANT',
  HOLD               = 'HOLD',
}

export enum WalletTransactionType {
  DEPOSIT         = 'DEPOSIT',
  WITHDRAWAL      = 'WITHDRAWAL',
  ESCROW_LOCK     = 'ESCROW_LOCK',
  ESCROW_RELEASE  = 'ESCROW_RELEASE',
  ESCROW_REFUND   = 'ESCROW_REFUND',
  TRADE_CREDIT    = 'TRADE_CREDIT',
  TRADE_DEBIT     = 'TRADE_DEBIT',
}

export enum NotificationType {
  ORDER_CREATED             = 'ORDER_CREATED',
  PAYMENT_MARKED            = 'PAYMENT_MARKED',
  PAYMENT_CONFIRMED         = 'PAYMENT_CONFIRMED',
  ORDER_COMPLETED           = 'ORDER_COMPLETED',
  ORDER_CANCELLED           = 'ORDER_CANCELLED',
  DISPUTE_OPENED            = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED          = 'DISPUTE_RESOLVED',
  KYC_APPROVED              = 'KYC_APPROVED',
  SYSTEM                    = 'SYSTEM',
  SCAN_PAY_CREATED              = 'SCAN_PAY_CREATED',
  SCAN_PAY_MERCHANT_PAID        = 'SCAN_PAY_MERCHANT_PAID',
  SCAN_PAY_MERCHANT_ACCEPTED    = 'SCAN_PAY_MERCHANT_ACCEPTED',
  SCAN_PAY_RECEIVER_SUBMITTED   = 'SCAN_PAY_RECEIVER_SUBMITTED',
}

// ─── State Machine ────────────────────────────────────────────────────────────

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // ── P2P Trade flow ───────────────────────────────────────────────────────
  [OrderStatus.CREATED]:                [OrderStatus.MATCHED, OrderStatus.CANCELLED],
  [OrderStatus.MATCHED]:                [OrderStatus.ESCROW_LOCKED, OrderStatus.CANCELLED],
  [OrderStatus.ESCROW_LOCKED]:          [OrderStatus.PAID_MARKED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_PENDING]:        [OrderStatus.PAID_MARKED, OrderStatus.CANCELLED],
  [OrderStatus.PAID_MARKED]:            [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.DISPUTE, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_CONFIRMED]:      [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]:              [],
  [OrderStatus.DISPUTE]:                [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]:              [],
  [OrderStatus.REFUNDED]:               [],
  // ── Scan & Pay flow ──────────────────────────────────────────────────────
  // MATCHED → merchant accepts → user submits receiver → merchant pays → COMPLETED
  [OrderStatus.SCAN_PAY_MERCHANT_PAID]: [OrderStatus.COMPLETED, OrderStatus.DISPUTE, OrderStatus.CANCELLED],
  [OrderStatus.MERCHANT_ACCEPTED]:  [OrderStatus.RECEIVER_SUBMITTED, OrderStatus.CANCELLED],
  [OrderStatus.RECEIVER_SUBMITTED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTE, OrderStatus.CANCELLED],
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub:   string;
  email: string;
  role:  UserRole;
}

export interface OrderStateTransition {
  from:   OrderStatus;
  to:     OrderStatus;
  actor:  'USER' | 'MERCHANT' | 'ADMIN' | 'SYSTEM';
  reason?: string;
}
