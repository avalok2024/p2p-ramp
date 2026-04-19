import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// ── Entities ─────────────────────────────────────────────────────────────────
import { User } from './entities/user.entity';
import { MerchantAd } from './entities/merchant-ad.entity';
import { Order } from './entities/order.entity';
import { Escrow } from './entities/escrow.entity';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Dispute } from './entities/dispute.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';

// ── Feature Modules ───────────────────────────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { MatchingModule } from './modules/matching/matching.module';
import { PaymentModule } from './modules/payment/payment.module';
import { OrderModule } from './modules/order/order.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { DisputeModule } from './modules/dispute/dispute.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Config (env) ────────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // ── Database ─────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => {
        const databaseUrl = cfg.get<string>('DATABASE_URL');

        // ── Pre-flight: add new enum values BEFORE TypeORM synchronize ────────
        // TypeORM's synchronize cannot add values to existing PostgreSQL enums.
        // We patch them manually using a raw connection first, then let TypeORM sync.
        const { DataSource } = await import('typeorm');
        const preFlightDs = new DataSource(
          databaseUrl
            ? { type: 'postgres', url: databaseUrl, ssl: { rejectUnauthorized: false } }
            : {
                type: 'postgres',
                host: cfg.get<string>('DB_HOST') ?? 'localhost',
                port: cfg.get<number>('DB_PORT') ?? 5432,
                username: cfg.get<string>('DB_USER') ?? 'ramp_user',
                password: cfg.get<string>('DB_PASSWORD') ?? 'ramp_pass',
                database: cfg.get<string>('DB_NAME') ?? 'p2p_ramp',
                ssl: false,
              },
        );
        try {
          await preFlightDs.initialize();
          const enumPatches = [
            `ALTER TYPE "order_type_enum"          ADD VALUE IF NOT EXISTS 'SCAN_PAY'`,
            `ALTER TYPE "order_status_enum"         ADD VALUE IF NOT EXISTS 'MERCHANT_ACCEPTED'`,
            `ALTER TYPE "order_status_enum"         ADD VALUE IF NOT EXISTS 'RECEIVER_SUBMITTED'`,
            `ALTER TYPE "order_status_enum"         ADD VALUE IF NOT EXISTS 'SCAN_PAY_MERCHANT_PAID'`,
            `ALTER TYPE "notifications_type_enum"   ADD VALUE IF NOT EXISTS 'SCAN_PAY_CREATED'`,
            `ALTER TYPE "notifications_type_enum"   ADD VALUE IF NOT EXISTS 'SCAN_PAY_MERCHANT_PAID'`,
            `ALTER TYPE "notifications_type_enum"   ADD VALUE IF NOT EXISTS 'SCAN_PAY_MERCHANT_ACCEPTED'`,
            `ALTER TYPE "notifications_type_enum"   ADD VALUE IF NOT EXISTS 'SCAN_PAY_RECEIVER_SUBMITTED'`,
          ];
          for (const sql of enumPatches) {
            await preFlightDs.query(sql).catch(() => {/* table/type may not exist yet on fresh DB */});
          }
        } catch (e) {
          console.warn('[AppModule] Pre-flight enum patch skipped:', (e as Error).message);
        } finally {
          await preFlightDs.destroy().catch(() => {});
        }

        // Railway (production) provides DATABASE_URL — use it directly.
        // Local dev falls back to individual DB_* vars pointing at Docker Postgres.
        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        // Local dev: individual env vars, no SSL (plain Docker Postgres)
        return {
          type: 'postgres' as const,
          host: cfg.get<string>('DB_HOST') ?? 'localhost',
          port: cfg.get<number>('DB_PORT') ?? 5432,
          username: cfg.get<string>('DB_USER') ?? 'ramp_user',
          password: cfg.get<string>('DB_PASSWORD') ?? 'ramp_pass',
          database: cfg.get<string>('DB_NAME') ?? 'p2p_ramp',
          ssl: false,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),


    // ── Feature modules ───────────────────────────────────────────────────────
    AuthModule,
    WalletModule,
    MerchantModule,
    MatchingModule,
    PaymentModule,
    OrderModule,
    EscrowModule,
    DisputeModule,
    NotificationModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule { }
