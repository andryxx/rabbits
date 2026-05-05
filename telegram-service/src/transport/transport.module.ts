import { Module, forwardRef } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { TelegramCallbackPublisherTransport } from './telegram.callback.publisher.transport';
import { TelegramRabbitListenerTransport } from './telegram.rabbit.listener.transport';

@Module({
  imports: [forwardRef(() => TelegramModule)],
  providers: [
    TelegramCallbackPublisherTransport,
    TelegramRabbitListenerTransport,
  ],
  exports: [TelegramCallbackPublisherTransport],
})
export class TransportModule {}
