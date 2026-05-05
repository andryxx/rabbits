import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { parseTelegramNotifyMessage } from '../telegram/telegram.notify.parser';
import { parseTelegramDirectMessage } from '../telegram/telegram.direct.notify.parser';
import { TelegramService } from '../telegram/services/telegram.service';

const DEFAULT_EXCHANGE = 'telegram';
const DEFAULT_BIND_KEY = 'telegram.*';
const DEFAULT_QUEUE = 'rabbit.consumer.telegram';

interface ConnectAndConsumeArgs {
  url: string;
  exchange: string;
  routingKey: string;
  queueName: string;
}

@Injectable()
export class TelegramRabbitListenerTransport
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramRabbitListenerTransport.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('rabbit_amqpUrl')?.trim();

    if (!url) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, Telegram RabbitMQ listener is disabled',
      );
      return;
    }

    const exchange =
      this.config.get<string>('rabbit_exchangeTelegram') ?? DEFAULT_EXCHANGE;
    const routingKey =
      this.config.get<string>('rabbit_topicTelegramRoutingKey') ??
      DEFAULT_BIND_KEY;
    const queueName =
      this.config.get<string>('rabbit_consumerTelegramQueue') ?? DEFAULT_QUEUE;

    await this.connectAndConsume({
      url,
      exchange,
      routingKey,
      queueName,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeConnection();
  }

  private async dispatchMessage(msg: amqp.ConsumeMessage): Promise<void> {
    const ch = this.channel;
    if (!ch) {
      return;
    }

    const routingKeyMsg = msg.fields.routingKey;
    let parsed: unknown;

    try {
      parsed = JSON.parse(msg.content.toString()) as unknown;
    } catch {
      this.logger.warn(
        { routingKey: routingKeyMsg },
        'Telegram notify message is not valid JSON, skipping',
      );
      ch.ack(msg);
      return;
    }

    const direct = parseTelegramDirectMessage(parsed);

    if (direct) {
      try {
        await this.telegramService.sendText({
          chatId: direct.chatId,
          text: direct.text,
          replyToMessageId: direct.replyToMessageId,
        });

        ch.ack(msg);
      } catch (err) {
        this.logger.error(err);
        ch.nack(msg, false, false);
      }

      return;
    }

    const payload = parseTelegramNotifyMessage(parsed);

    if (!payload) {
      this.logger.warn(
        { routingKey: routingKeyMsg },
        'Telegram notify payload is invalid, skipping',
      );
      ch.ack(msg);
      return;
    }

    try {
      if (payload.rabbitId !== undefined) {
        await this.telegramService.broadcastBornNotification({
          text: payload.text,
          rabbitId: payload.rabbitId,
        });
      } else {
        await this.telegramService.broadcastText(payload.text);
      }

      ch.ack(msg);
    } catch (err) {
      this.logger.error(err);
      ch.nack(msg, false, false);
    }
  }

  private async connectAndConsume(args: ConnectAndConsumeArgs): Promise<void> {
    const { url, exchange, routingKey, queueName } = args;

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.bindQueue(queueName, exchange, routingKey);

    const { consumerTag } = await this.channel.consume(
      queueName,
      (msg) => {
        if (!msg || !this.channel) {
          return;
        }

        void this.dispatchMessage(msg).catch((err: unknown) => {
          this.logger.error(err);

          if (this.channel) {
            this.channel.nack(msg, false, false);
          }
        });
      },
      { noAck: false },
    );

    this.consumerTag = consumerTag;

    this.logger.log(
      `Telegram RabbitMQ listener: exchange="${exchange}" queue="${queueName}" bind="${routingKey}"`,
    );
  }

  private async closeConnection(): Promise<void> {
    try {
      if (this.channel && this.consumerTag) {
        await this.channel.cancel(this.consumerTag);
        this.consumerTag = null;
      }

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
}
