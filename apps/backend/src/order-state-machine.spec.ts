import { ORDER_TRANSITIONS, OrderStatus } from '../../../packages/shared/src';

describe('ORDER_TRANSITIONS (shared state machine)', () => {
  it('allows escrow lock to cancel or paid-marked', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.ESCROW_LOCKED]).toContain(OrderStatus.PAID_MARKED);
    expect(ORDER_TRANSITIONS[OrderStatus.ESCROW_LOCKED]).toContain(OrderStatus.CANCELLED);
  });

  it('terminal states have no outbound transitions', () => {
    expect(ORDER_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([]);
    expect(ORDER_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([]);
    expect(ORDER_TRANSITIONS[OrderStatus.REFUNDED]).toEqual([]);
  });

  it('paid marked can resolve via confirm, dispute, or cancel', () => {
    const next = ORDER_TRANSITIONS[OrderStatus.PAID_MARKED];
    expect(next).toEqual(
      expect.arrayContaining([
        OrderStatus.PAYMENT_CONFIRMED,
        OrderStatus.DISPUTE,
        OrderStatus.CANCELLED,
      ]),
    );
  });
});
