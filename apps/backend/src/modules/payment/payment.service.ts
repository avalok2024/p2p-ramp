import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService {
  /**
   * Generate a slightly randomised fiat amount (adds paise) to help merchants
   * identify unique payments without a bank API.
   * e.g. ₹5000 → ₹5000.37
   */
  generateUniqueAmount(baseAmount: number): number {
    const paise = Math.floor(Math.random() * 99) + 1; // 1–99
    return parseFloat((baseAmount + paise / 100).toFixed(2));
  }

  /**
   * Generate a short human-readable reference code shown on the payment screen.
   * e.g. RAMP-A3F9
   */
  generateReferenceCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'RAMP-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Build a UPI deep-link QR string from merchant UPI ID.
   * Can be fed directly into qrcode.react on the frontend.
   */
  buildUpiQrString(params: {
    upiId: string;
    payeeName: string;
    /** Postgres `decimal` columns often arrive as strings from TypeORM */
    amount: number | string;
    referenceCode: string;
    remarks?: string;
  }): string {
    const { upiId, payeeName, amount, referenceCode, remarks } = params;
    const n = typeof amount === 'number' && Number.isFinite(amount)
      ? amount
      : parseFloat(String(amount).replace(/,/g, ''));
    const amt = Number.isFinite(n) ? n : 0;
    const note = remarks ? `${remarks} Ref:${referenceCode}` : `Ref:${referenceCode}`;
    return (
      `upi://pay?pa=${encodeURIComponent(upiId)}` +
      `&pn=${encodeURIComponent(payeeName)}` +
      `&am=${amt.toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(note)}`
    );
  }
}
