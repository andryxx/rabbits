import { Module } from '@nestjs/common';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';
import { RedisModule } from '../redis/redis.module';
import { RabbitController } from './controllers/rabbit.controller';
import { RabbitService } from './services/rabbit.service';
import { RabbitStorage } from './storage/rabbit.storage';
import { RabbitsBornHandler } from './transport/rabbits.born.handler';
import { TelegramCallbackHandler } from './transport/telegram.callback.handler';
import { RabbitRabbitsTransport } from './transport/rabbit.rabbits.transport';
import { RabbitTelegramTransport } from './transport/rabbit.telegram.transport';

@Module({
  imports: [RedisModule, RabbitMqModule],
  controllers: [RabbitController],
  providers: [
    RabbitStorage,
    TelegramCallbackHandler,
    RabbitService,
    RabbitTelegramTransport,
    RabbitsBornHandler,
    RabbitRabbitsTransport,
  ],
  exports: [RabbitService],
})
export class RabbitModule {}
