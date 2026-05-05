import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

const DEFAULT_EXCHANGE = 'telegram';
const DEFAULT_ROUTING_KEY = 'telegram.rabbit.callback';

interface PublishTelegramCallbackArgs {
  payload: Record<string, unknown>;
}

@Injectable()
export class TelegramCallbackPublisherTransport
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramCallbackPublisherTransport.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private readonly exchange: string;
  private readonly routingKey: string;

  constructor(private readonly config: ConfigService) {
    this.exchange =
      this.config.get<string>('rabbit_exchangeTelegram') ?? DEFAULT_EXCHANGE;
    this.routingKey =
      this.config.get<string>('rabbit_publishTelegramCallbackRoutingKey') ??
      DEFAULT_ROUTING_KEY;
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('rabbit_amqpUrl')?.trim();

    if (!url) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, Telegram callback publisher is disabled',
      );
      return;
    }

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    this.logger.log(
      `Telegram callback MQ publisher ready: exchange="${this.exchange}" routingKey="${this.routingKey}"`,
    );
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

  async publish(config: PublishTelegramCallbackArgs): Promise<void> {
    if (!this.channel) {
      throw new Error(
        'Telegram callback RabbitMQ publisher is not initialized',
      );
    }

    const { payload } = config;
    const body = Buffer.from(JSON.stringify(payload));

    const ch = this.channel;

    const sent = ch.publish(this.exchange, this.routingKey, body, {
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
