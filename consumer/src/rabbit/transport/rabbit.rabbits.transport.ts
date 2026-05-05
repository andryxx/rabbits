import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqBrokerService } from '../../rabbitmq/rabbitmq.broker.service';
import { RabbitMqConsumerService } from '../../rabbitmq/rabbitmq.consumer.service';
import { RabbitsBornHandler } from './rabbits.born.handler';

const DEFAULT_EXCHANGE = 'rabbits';
const DEFAULT_BIND_KEY = '#';

@Injectable()
export class RabbitRabbitsTransport implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitRabbitsTransport.name);
  private cancelConsumer: (() => Promise<void>) | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly rabbitMqBroker: RabbitMqBrokerService,
    private readonly rabbitMqConsumer: RabbitMqConsumerService,
    private readonly rabbitsBornHandler: RabbitsBornHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMqBroker.isAvailable()) {
      this.logger.warn(
        'rabbit_amqpUrl is not set, RabbitMQ born consumer is disabled',
      );
      return;
    }

    const exchange =
      this.config.get<string>('rabbit_exchangeRabbits') ?? DEFAULT_EXCHANGE;
    const routingKey =
      this.config.get<string>('rabbit_topicRoutingKey') ?? DEFAULT_BIND_KEY;
    const queueName =
      this.config.get<string>('rabbit_consumerQueue') ??
      'rabbit.consumer.rabbits';

    const handle = await this.rabbitMqConsumer.runTopicConsumer({
      exchange,
      routingKey,
      queueName,
      consumerLogger: this.logger,
      handleMessage: (msg, ch) => this.rabbitsBornHandler.handle(msg, ch),
    });

    this.cancelConsumer = () => handle.cancel();
    this.logger.log(
      `Born RabbitMQ transport listening: exchange="${exchange}" queue="${queueName}" bind="${routingKey}"`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cancelConsumer) {
      await this.cancelConsumer();
      this.cancelConsumer = null;
    }
  }
}
