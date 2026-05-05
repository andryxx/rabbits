import { Injectable } from '@nestjs/common';
import type * as amqp from 'amqplib';
import { RabbitMqBrokerService } from './rabbitmq.broker.service';
import { RabbitMqRunTopicConsumerArgs } from './types/rabbitmq.run.topic.consumer.args';
import { RabbitMqTopicConsumerHandle } from './types/rabbitmq.topic.consumer.handle';

@Injectable()
export class RabbitMqConsumerService {
  constructor(private readonly rabbitMqBroker: RabbitMqBrokerService) {}

  async runTopicConsumer(
    config: RabbitMqRunTopicConsumerArgs,
  ): Promise<RabbitMqTopicConsumerHandle> {
    const ch = await this.rabbitMqBroker.createChannel();
    const { exchange, routingKey, queueName, consumerLogger, handleMessage } =
      config;

    await ch.assertExchange(exchange, 'topic', { durable: true });
    await ch.assertQueue(queueName, { durable: true });
    await ch.bindQueue(queueName, exchange, routingKey);

    const { consumerTag } = await ch.consume(
      queueName,
      (msg: amqp.ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        void handleMessage(msg, ch).catch((err: unknown) => {
          consumerLogger.error(err);
          ch.nack(msg, false, false);
        });
      },
      { noAck: false },
    );

    return {
      cancel: async (): Promise<void> => {
        try {
          await ch.cancel(consumerTag);
          await ch.close();
        } catch {
          /* ignore close races */
        }
      },
    };
  }
}
