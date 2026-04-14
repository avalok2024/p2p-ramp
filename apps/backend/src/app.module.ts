import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

// ── Entities ─────────────────────────────────────────────────────────────────
import { User }             from './entities/user.entity';
import { MerchantAd }       from './entities/merchant-ad.entity';
import { Order }            from './entities/order.entity';
import { Escrow }           from './entities/escrow.entity';
import { Wallet }           from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Dispute }          from './entities/dispute.entity';
import { AuditLog }         from './entities/audit-log.entity';
import { Notification }     from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';

// ── Feature Modules ───────────────────────────────────────────────────────────
import { AuthModule }         from './modules/auth/auth.module';
import { WalletModule }       from './modules/wallet/wallet.module';
import { MerchantModule }     from './modules/merchant/merchant.module';
import { MatchingModule }     from './modules/matching/matching.module';
import { PaymentModule }      from './modules/payment/payment.module';
import { OrderModule }        from './modules/order/order.module';
import { EscrowModule }       from './modules/escrow/escrow.module';
import { DisputeModule }      from './modules/dispute/dispute.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule }        from './modules/admin/admin.module';
import { HealthModule }       from './health/health.module';

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
      useFactory: (cfg: ConfigService) => ({
        type:        'postgres',
        // 127.0.0.1 avoids Windows resolving "localhost" to ::1 while Docker publishes 5432 on IPv4 only
        host:        cfg.get('DB_HOST',     '127.0.0.1'),
        port:        cfg.get<number>('DB_PORT', 5432),
        username:    cfg.get('DB_USER',     'ramp_user'),
        password:    cfg.get('DB_PASSWORD', 'ramp_pass'),
        database:    cfg.get('DB_NAME',     'p2p_ramp'),
        entities:    [
          User, MerchantAd, Order, Escrow,
          Wallet, WalletTransaction, Dispute,
          AuditLog, Notification, PushSubscription,
        ],
        synchronize: cfg.get<string>('DB_SYNC', 'true') === 'true',
        dropSchema:  true, // Temporary to force DB reset
        logging:     cfg.get<string>('DB_LOGGING', 'false') === 'true',
        retryAttempts: Number(cfg.get('DB_RETRY_ATTEMPTS', 15)) || 15,
        retryDelay:    Number(cfg.get('DB_RETRY_DELAY_MS', 2000)) || 2000,
      }),
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
export class AppModule {}
