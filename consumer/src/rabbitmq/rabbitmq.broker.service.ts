import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqBrokerService.name);
  private connection: amqp.ChannelModel | null = null;

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
    this.logger.log('RabbitMQ connection ready');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      this.logger.warn(err);
    }
  }

  isAvailable(): boolean {
    return this.connection !== null;
  }

  async createChannel(): Promise<amqp.Channel> {
    const conn = this.connection;
    if (!conn) {
      throw new Error('RabbitMQ is not initialized');
    }

    return conn.createChannel();
  }

  async createConfirmChannel(): Promise<amqp.ConfirmChannel> {
    const conn = this.connection;
    if (!conn) {
      throw new Error('RabbitMQ is not initialized');
    }

    return conn.createConfirmChannel();
  }
}
