import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as amqp from 'amqplib';
import { RabbitMqBrokerService } from '../../rabbitmq/rabbitmq.broker.service';
import { RabbitMqConsumerService } from '../../rabbitmq/rabbitmq.consumer.service';
import { PublishTelegramDirectAckArgs } from '../types/publish.telegram.direct.ack.args';
import { TelegramCallbackHandler } from './telegram.callback.handler';

const DEFAULT_EXCHANGE = 'telegram';
const DEFAULT_ROUTING_KEY = 'telegram.notify';
const DEFAULT_DIRECT_ROUTING_KEY = 'telegram.direct';
const DEFAULT_CALLBACK_BIND_KEY = 'telegram.rabbit.callback';
const DEFAULT_CALLBACK_QUEUE = 'rabbit.consumer.telegram.callback';

interface PublishTelegramNotificationArgs {
  payload: Record<string, unknown>;
  routingKey?: string;
}

@Injectable()
export class RabbitTelegramTransport implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitTelegramTransport.name);
  private publishChannel: amqp.ConfirmChannel | null = null;
  private cancelConsumer: (() => Promise<void>) | null = null;
  private readonly exchange: string;
  private readonly notifyRoutingKey: string;
  private readonly directRoutingKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitMqBroker: RabbitMqBrokerService,
    private readonly rabbitMqConsumer: RabbitMqConsumerService,
    @Inject(forwardRef(() => TelegramCallbackHandler))
    private readonly telegramCallbackHandler: TelegramCallbackHandler,
  ) {
    this.exchange =
      this.config.get<string>('rabbit_exchangeTelegram') ?? DEFAULT_EXCHANGE;
    this.notifyRoutingKey =
      this.config.get<string>('rabbit_publishTelegramRoutingKey') ??
      DEFAULT_ROUTING_KEY;
    this.directRoutingKey =
      this.config.get<string>('rabbit_publishTelegramDirectRoutingKey') ??
      DEFAULT_DIRECT_ROUTING_KEY;
  }

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMqBroker.isAvailable()) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, Telegram RabbitMQ transport is disabled',
      );
      return;
    }

    this.publishChannel = await this.rabbitMqBroker.createConfirmChannel();
    await this.publishChannel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    const callbackRoutingKey =
      this.config.get<string>('rabbit_telegramCallbackRoutingKey') ??
      DEFAULT_CALLBACK_BIND_KEY;
    const callbackQueueName =
      this.config.get<string>('rabbit_consumerTelegramCallbackQueue') ??
      DEFAULT_CALLBACK_QUEUE;

    const handle = await this.rabbitMqConsumer.runTopicConsumer({
      exchange: this.exchange,
      routingKey: callbackRoutingKey,
      queueName: callbackQueueName,
      consumerLogger: this.logger,
      handleMessage: (msg, ch) => this.telegramCallbackHandler.handle(msg, ch),
    });

    this.cancelConsumer = () => handle.cancel();

    this.logger.log(
      `Telegram RabbitMQ transport ready: exchange="${this.exchange}" publishRoutingKey="${this.notifyRoutingKey}" callbackQueue="${callbackQueueName}" bind="${callbackRoutingKey}"`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cancelConsumer) {
      await this.cancelConsumer();
      this.cancelConsumer = null;
    }

    try {
      if (this.publishChannel) {
        await this.publishChannel.close();
        this.publishChannel = null;
      }
    } catch (err) {
      this.logger.warn(err);
    }
  }

  async publish(config: PublishTelegramNotificationArgs): Promise<void> {
    if (!this.publishChannel) {
      throw new Error('Telegram RabbitMQ publisher is not initialized');
    }

    const { payload, routingKey } = config;
    const rk = routingKey ?? this.notifyRoutingKey;
    const body = Buffer.from(JSON.stringify(payload));

    const ch = this.publishChannel;

    const sent = ch.publish(this.exchange, rk, body, {
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

  async publishDirectAck(config: PublishTelegramDirectAckArgs): Promise<void> {
    const { chatId, text, replyToMessageId } = config;

    const payload: Record<string, unknown> = {
      kind: 'direct_message',
      chatId,
      text,
    };

    if (replyToMessageId !== undefined) {
      payload.replyToMessageId = replyToMessageId;
    }

    await this.publish({
      payload,
      routingKey: this.directRoutingKey,
    });
  }
}
