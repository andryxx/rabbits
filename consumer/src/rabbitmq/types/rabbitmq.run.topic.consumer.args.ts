import type { Logger } from '@nestjs/common';
import type * as amqp from 'amqplib';

export interface RabbitMqRunTopicConsumerArgs {
  exchange: string;
  routingKey: string;
  queueName: string;
  consumerLogger: Logger;
  handleMessage: (
    msg: amqp.ConsumeMessage,
    channel: amqp.Channel,
  ) => Promise<void>;
}
