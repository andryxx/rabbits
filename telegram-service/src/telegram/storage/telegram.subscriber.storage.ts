import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

const DEFAULT_SUBSCRIBERS_SET_KEY = 'telegram:bot:subscribers';

@Injectable()
export class TelegramSubscriberStorage {
  private readonly subscribersKey: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {
    this.subscribersKey =
      this.config.get<string>('rabbit_redisTelegramSubscribersKey') ??
      DEFAULT_SUBSCRIBERS_SET_KEY;
  }

  async addSubscriber(chatId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.sadd(this.subscribersKey, chatId);
  }

  async getSubscriberChatIds(): Promise<string[]> {
    const redis = this.redisService.getClient();
    const members = await redis.smembers(this.subscribersKey);
    return [...members].sort();
  }

  async removeSubscriber(chatId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.srem(this.subscribersKey, chatId);
  }
}
