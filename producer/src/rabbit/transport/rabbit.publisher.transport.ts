import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqPublisherService } from '../../rabbitmq/rabbitmq.publisher.service';

const DEFAULT_EXCHANGE = 'rabbits';

interface RabbitPublisherTransportPublishArgs {
  payload: Record<string, unknown>;
}

@Injectable()
export class RabbitPublisherTransport implements OnModuleInit {
  private readonly logger = new Logger(RabbitPublisherTransport.name);
  private readonly exchange: string;
  private readonly routingKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitMqPublisher: RabbitMqPublisherService,
  ) {
    this.exchange =
      this.config.get<string>('rabbit_exchangeRabbits') ?? DEFAULT_EXCHANGE;
    this.routingKey =
      this.config.get<string>('rabbit_publishRoutingKey') ?? 'rabbit.born';
  }

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMqPublisher.isAvailable()) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, Rabbit born publisher transport is inactive',
      );
      return;
    }

    await this.rabbitMqPublisher.assertExchange({
      exchange: this.exchange,
      type: 'topic',
      options: { durable: true },
    });

    this.logger.log(
      `Rabbit born transport ready: exchange="${this.exchange}" routingKey="${this.routingKey}"`,
    );
  }

  async publish(config: RabbitPublisherTransportPublishArgs): Promise<void> {
    if (!this.rabbitMqPublisher.isAvailable()) {
      throw new Error('RabbitMQ publisher is not initialized');
    }

    await this.rabbitMqPublisher.publishJson({
      exchange: this.exchange,
      routingKey: this.routingKey,
      payload: config.payload,
    });
  }
}
