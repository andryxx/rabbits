import { Injectable, Logger } from '@nestjs/common';
import type * as amqp from 'amqplib';
import { executeWithConsumeRetry } from '../../rabbitmq/consume.retry';
import {
  RabbitMqConsumeMessageParseService,
  isParseConsumeMessageBodyFailure,
} from '../../rabbitmq/rabbitmq.consume.message.parse.service';
import { RabbitMqConsumeRetrySettings } from '../../rabbitmq/rabbitmq.consume.retry.settings';
import { parseRabbitsBornPayload } from '../../rabbitmq/rabbitmq.parse.rabbits.born.payload';
import { RabbitService } from '../services/rabbit.service';
import { RabbitTelegramTransport } from './rabbit.telegram.transport';

@Injectable()
export class RabbitsBornHandler {
  private readonly logger = new Logger(RabbitsBornHandler.name);

  constructor(
    private readonly rabbitMqConsumeMessageParseService: RabbitMqConsumeMessageParseService,
    private readonly rabbitMqConsumeRetrySettings: RabbitMqConsumeRetrySettings,
    private readonly rabbitService: RabbitService,
    private readonly rabbitTelegramTransport: RabbitTelegramTransport,
  ) {}

  async handle(msg: amqp.ConsumeMessage, ch: amqp.Channel): Promise<void> {
    const routingKeyMsg = msg.fields.routingKey;
    const parsed =
      this.rabbitMqConsumeMessageParseService.parseConsumeMessageBody(
        msg,
        parseRabbitsBornPayload,
      );

    if (isParseConsumeMessageBodyFailure(parsed)) {
      if (parsed.reason === 'invalid_json') {
        this.logger.warn(
          { routingKey: routingKeyMsg },
          'Born message is not valid JSON, skipping',
        );
      } else {
        this.logger.warn(
          { routingKey: routingKeyMsg },
          'Born message payload is invalid, skipping',
        );
      }
      ch.ack(msg);
      return;
    }

    const born = parsed.data;

    try {
      const result = await executeWithConsumeRetry(
        {
          maxAttempts: this.rabbitMqConsumeRetrySettings.consumeMaxAttempts,
          logger: this.logger,
          contextLabel: `Очередь рождения: сохранение rabbitId=${born.createArgs.id}`,
        },
        () => this.rabbitService.persistBornRabbitFromQueue(born.createArgs),
      );

      if (result.outcome === 'name_conflict') {
        this.logger.warn(
          {
            rabbitId: born.createArgs.id,
            name: born.createArgs.name,
          },
          'Born rabbit not persisted: name conflict',
        );
        this.logger.log(
          {
            rabbitId: born.createArgs.id,
            routingKey: routingKeyMsg,
          },
          'Очередь рождения: обработка сообщения завершена (конфликт имени)',
        );
      } else if (result.outcome === 'duplicate_id') {
        this.logger.debug(
          {
            rabbitId: result.rabbit?.id,
          },
          'Born rabbit message duplicate (id already exists), skipping notify',
        );
        this.logger.log(
          {
            rabbitId: result.rabbit?.id,
            routingKey: routingKeyMsg,
          },
          'Очередь рождения: обработка сообщения завершена (дубликат)',
        );
      } else {
        const rabbit = result.rabbit!;

        this.logger.log(
          {
            rabbitId: rabbit.id,
            routingKey: routingKeyMsg,
          },
          'Born rabbit persisted from queue',
        );

        await executeWithConsumeRetry(
          {
            maxAttempts: this.rabbitMqConsumeRetrySettings.consumeMaxAttempts,
            logger: this.logger,
            contextLabel: `Очередь рождения: Telegram notify rabbitId=${rabbit.id}`,
          },
          () =>
            this.rabbitTelegramTransport.publish({
              payload: {
                color: rabbit.color,
                name: rabbit.name,
                rabbitId: rabbit.id,
              },
            }),
        );
        this.logger.log(
          {
            rabbitId: rabbit.id,
            routingKey: routingKeyMsg,
          },
          'Очередь рождения: обработка сообщения успешно завершена',
        );
      }

      ch.ack(msg);
    } catch {
      ch.nack(msg, false, false);
    }
  }
}
