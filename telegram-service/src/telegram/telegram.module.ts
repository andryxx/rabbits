import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { TransportModule } from '../transport/transport.module';
import { TelegramSubscriberStorage } from './storage/telegram.subscriber.storage';
import { TelegramService } from './services/telegram.service';

@Module({
  imports: [RedisModule, forwardRef(() => TransportModule)],
  providers: [TelegramSubscriberStorage, TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
