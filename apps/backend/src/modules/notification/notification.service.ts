import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { Notification }     from '../../entities/notification.entity';
import { PushSubscription } from '../../entities/push-subscription.entity';
import { NotificationType } from '../../../../../packages/shared/src';
import { IsString, IsObject, IsOptional } from 'class-validator';

interface SendPayload {
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly log = new Logger(NotificationService.name);
  /** False when VAPID keys are missing or still placeholders — in-app notifications still work. */
  private vapidConfigured = false;

  constructor(
    @InjectRepository(Notification)    private notifRepo: Repository<Notification>,
    @InjectRepository(PushSubscription) private subRepo:  Repository<PushSubscription>,
    private cfg: ConfigService,
  ) {
    const publicKey  = cfg.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = cfg.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const email      = cfg.get<string>('VAPID_EMAIL', 'mailto:admin@p2pramp.dev');
    if (!publicKey || !privateKey) {
      this.log.warn('VAPID keys not set — Web Push disabled. Run: npx web-push generate-vapid-keys');
      return;
    }
    const placeholder = /your[_-]?vapid|placeholder|changeme/i.test(publicKey + privateKey);
    if (placeholder) {
      this.log.warn('VAPID keys look like placeholders — Web Push disabled until real keys are set in .env');
      return;
    }
    try {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.vapidConfigured = true;
    } catch (e) {
      this.log.warn(`Web Push VAPID init failed (${(e as Error).message}) — push disabled`);
    }
  }

  /** Save in-app notification + send Web Push to all user devices */
  async send(userId: string, type: NotificationType, payload: SendPayload): Promise<void> {
    // 1. Save in-app notification
    await this.notifRepo.save(
      this.notifRepo.create({
        userId,
        type,
        title:   payload.title,
        message: payload.message,
        data:    payload.data ?? {},
      }),
    );

    // 2. Push to all subscribed devices (skipped if VAPID was never configured)
    if (!this.vapidConfigured) return;

    const subs = await this.subRepo.find({ where: { userId } });
    const pushBody = JSON.stringify({ title: payload.title, body: payload.message, data: payload.data });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.authKey, p256dh: sub.p256dhKey } },
          pushBody,
        );
      } catch (err: any) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.subRepo.remove(sub);
        }
      }
    }
  }

  async getInAppNotifications(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }

  async markRead(notifId: string, userId: string) {
    await this.notifRepo.update({ id: notifId, userId }, { isRead: true });
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update({ userId }, { isRead: true });
  }

  async savePushSubscription(userId: string, sub: {
    endpoint: string; authKey: string; p256dhKey: string; userAgent?: string;
  }) {
    const existing = await this.subRepo.findOne({ where: { endpoint: sub.endpoint } });
    if (existing) {
      existing.userId = userId;
      return this.subRepo.save(existing);
    }
    return this.subRepo.save(this.subRepo.create({ userId, ...sub }));
  }

  async removePushSubscription(endpoint: string, userId: string) {
    await this.subRepo.delete({ endpoint, userId });
  }
}
