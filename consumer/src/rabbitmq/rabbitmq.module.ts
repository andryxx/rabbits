import { Module } from '@nestjs/common';
import { RabbitMqBrokerService } from './rabbitmq.broker.service';
import { RabbitMqConsumeMessageParseService } from './rabbitmq.consume.message.parse.service';
import { RabbitMqConsumeRetrySettings } from './rabbitmq.consume.retry.settings';
import { RabbitMqConsumerService } from './rabbitmq.consumer.service';

@Module({
  providers: [
    RabbitMqBrokerService,
    RabbitMqConsumerService,
    RabbitMqConsumeRetrySettings,
    RabbitMqConsumeMessageParseService,
  ],
  exports: [
    RabbitMqBrokerService,
    RabbitMqConsumerService,
    RabbitMqConsumeRetrySettings,
    RabbitMqConsumeMessageParseService,
  ],
})
export class RabbitMqModule {}
