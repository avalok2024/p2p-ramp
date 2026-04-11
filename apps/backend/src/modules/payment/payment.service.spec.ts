import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();
    service = module.get(PaymentService);
  });

  describe('buildUpiQrString', () => {
    it('builds a valid UPI URI with encoded fields', () => {
      const uri = service.buildUpiQrString({
        upiId: 'merchant@upi',
        payeeName: 'Test Merchant',
        amount: 5000.37,
        referenceCode: 'RAMP-ABC123',
        remarks: 'Order',
      });
      expect(uri).toMatch(/^upi:\/\/pay\?/);
      expect(uri).toContain('pa=' + encodeURIComponent('merchant@upi'));
      expect(uri).toContain('am=5000.37');
      expect(uri).toContain('cu=INR');
      expect(decodeURIComponent(uri)).toContain('Ref:RAMP-ABC123');
    });

    it('omits remarks but keeps reference in note', () => {
      const uri = service.buildUpiQrString({
        upiId: 'a@b',
        payeeName: 'X',
        amount: 100,
        referenceCode: 'RAMP-ZZZ999',
      });
      expect(decodeURIComponent(uri)).toContain('Ref:RAMP-ZZZ999');
    });

    it('accepts decimal amounts as strings (TypeORM / Postgres)', () => {
      const uri = service.buildUpiQrString({
        upiId: 'm@upi',
        payeeName: 'M',
        amount: '1234.56',
        referenceCode: 'RAMP-XX',
      });
      expect(uri).toContain('am=1234.56');
    });
  });

  describe('generateUniqueAmount', () => {
    it('adds between 0.01 and 0.99 to base amount', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(service.generateUniqueAmount(100)).toBe(100.01);
      jest.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(service.generateUniqueAmount(100)).toBe(100.99);
      jest.restoreAllMocks();
    });
  });

  describe('generateReferenceCode', () => {
    it('uses fixed prefix and 6 allowed chars', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const code = service.generateReferenceCode();
      expect(code).toMatch(/^RAMP-[A-Z2-9]{6}$/);
      jest.restoreAllMocks();
    });
  });
});
