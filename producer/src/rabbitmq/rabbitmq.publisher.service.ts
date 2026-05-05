import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RabbitMqAssertExchangeArgs } from './types/rabbitmq.assert.exchange.args';
import { RabbitMqPublishJsonArgs } from './types/rabbitmq.publish.json.args';

@Injectable()
export class RabbitMqPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisherService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('rabbit_amqpUrl')?.trim();
    if (!url) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, RabbitMQ client is disabled',
      );
      return;
    }

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createConfirmChannel();

    this.logger.log('RabbitMQ publisher channel ready');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      this.logger.warn(err);
    }
  }

  isAvailable(): boolean {
    return this.channel !== null;
  }

  async assertExchange(config: RabbitMqAssertExchangeArgs): Promise<void> {
    const ch = this.channel;
    if (!ch) {
      throw new Error('RabbitMQ is not initialized');
    }

    const { exchange, type, options } = config;
    await ch.assertExchange(exchange, type, options ?? { durable: true });
  }

  async publishJson(config: RabbitMqPublishJsonArgs): Promise<void> {
    const ch = this.channel;
    if (!ch) {
      throw new Error('RabbitMQ is not initialized');
    }

    const { exchange, routingKey, payload } = config;
    const body = Buffer.from(JSON.stringify(payload));

    const sent = ch.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      persistent: true,
    });

    if (!sent) {
      await new Promise<void>((resolve) => {
        ch.once('drain', resolve);
      });
    }

    await ch.waitForConfirms();
  }
}
