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
  CREATED             = 'CREATED',
  MATCHED             = 'MATCHED',
  ESCROW_LOCKED       = 'ESCROW_LOCKED',
  PAYMENT_PENDING     = 'PAYMENT_PENDING',
  PAID_MARKED         = 'PAID_MARKED',
  PAYMENT_CONFIRMED   = 'PAYMENT_CONFIRMED',
  COMPLETED           = 'COMPLETED',
  DISPUTE             = 'DISPUTE',
  CANCELLED           = 'CANCELLED',
  REFUNDED            = 'REFUNDED',
}

export enum OrderType {
  BUY  = 'BUY',
  SELL = 'SELL',
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
  ORDER_CREATED       = 'ORDER_CREATED',
  PAYMENT_MARKED      = 'PAYMENT_MARKED',
  PAYMENT_CONFIRMED   = 'PAYMENT_CONFIRMED',
  ORDER_COMPLETED     = 'ORDER_COMPLETED',
  ORDER_CANCELLED     = 'ORDER_CANCELLED',
  DISPUTE_OPENED      = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED    = 'DISPUTE_RESOLVED',
  KYC_APPROVED        = 'KYC_APPROVED',
  SYSTEM              = 'SYSTEM',
}

// ─── State Machine ────────────────────────────────────────────────────────────

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]:           [OrderStatus.MATCHED, OrderStatus.CANCELLED],
  [OrderStatus.MATCHED]:           [OrderStatus.ESCROW_LOCKED, OrderStatus.CANCELLED],
  [OrderStatus.ESCROW_LOCKED]:     [OrderStatus.PAID_MARKED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_PENDING]:   [OrderStatus.PAID_MARKED, OrderStatus.CANCELLED],
  [OrderStatus.PAID_MARKED]:       [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.DISPUTE, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_CONFIRMED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]:         [],
  [OrderStatus.DISPUTE]:           [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]:         [],
  [OrderStatus.REFUNDED]:          [],
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
