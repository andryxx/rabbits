import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import type * as amqp from 'amqplib';
import { executeWithConsumeRetry } from '../../rabbitmq/consume.retry';
import {
  RabbitMqConsumeMessageParseService,
  isParseConsumeMessageBodyFailure,
} from '../../rabbitmq/rabbitmq.consume.message.parse.service';
import { RabbitMqConsumeRetrySettings } from '../../rabbitmq/rabbitmq.consume.retry.settings';
import { parseTelegramCallbackPayload } from '../../rabbitmq/rabbitmq.parse.telegram.callback.payload';
import { RabbitStorage } from '../storage/rabbit.storage';
import { HandleTelegramRabbitCallbackArgs } from '../types/handle.telegram.rabbit.callback.args';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';
import { RabbitDto } from '../types/rabbit.dto';
import { TelegramCallbackAction } from '../types/telegram.callback.action.enum';
import { RabbitTelegramTransport } from './rabbit.telegram.transport';

@Injectable()
export class TelegramCallbackHandler {
  private readonly logger = new Logger(TelegramCallbackHandler.name);

  constructor(
    private readonly rabbitMqConsumeMessageParseService: RabbitMqConsumeMessageParseService,
    private readonly rabbitMqConsumeRetrySettings: RabbitMqConsumeRetrySettings,
    private readonly rabbitStorage: RabbitStorage,
    @Inject(forwardRef(() => RabbitTelegramTransport))
    private readonly rabbitTelegramTransport: RabbitTelegramTransport,
  ) {}

  private async formatStatsLine(): Promise<string> {
    const { bornTotal, inCage, freeRoaming, killedTotal } =
      await this.rabbitStorage.getRabbitPopulationStats();

    return [
      `Всего родилось: ${bornTotal}`,
      `В клетке: ${inCage}`,
      `Выпущено: ${freeRoaming}`,
      `Пристрелено: ${killedTotal}`,
    ].join('\n');
  }

  private async sendAck(
    config: Pick<
      HandleTelegramRabbitCallbackArgs,
      'chatId' | 'replyToMessageId'
    >,
    confirmationLine: string,
  ): Promise<void> {
    const { chatId, replyToMessageId } = config;

    try {
      await this.rabbitTelegramTransport.publishDirectAck({
        chatId,
        text: `${confirmationLine}\n\n${await this.formatStatsLine()}`,
        replyToMessageId,
      });
    } catch (err) {
      this.logger.warn(`Telegram direct ack failed: ${String(err)}`);
    }
  }

  private async handleKillAction(
    config: Pick<
      HandleTelegramRabbitCallbackArgs,
      'rabbitId' | 'chatId' | 'replyToMessageId'
    > & {
      existing: RabbitDto;
    },
  ): Promise<void> {
    const { rabbitId, existing } = config;

    const removed = await this.rabbitStorage.deleteRabbit({ rabbitId });

    if (!removed) {
      await this.sendAck(
        config,
        'Кролик не найден (возможно, уже пристрелен).',
      );
      return;
    }

    await this.rabbitStorage.incrKilledTotal();
    await this.sendAck(config, `Кролик ${existing.name} пристрелен.`);
  }

  private async handleInCageAction(
    config: Pick<
      HandleTelegramRabbitCallbackArgs,
      'rabbitId' | 'chatId' | 'replyToMessageId'
    > & {
      existing: RabbitDto;
    },
  ): Promise<void> {
    const { rabbitId, existing } = config;

    if (existing.allocation === RabbitAllocation.IN_CAGE) {
      await this.sendAck(config, 'Кролик уже в клетке.');
      return;
    }

    const rabbit = await this.rabbitStorage.updateRabbit({
      rabbitId,
      allocation: RabbitAllocation.IN_CAGE,
    });

    if (!rabbit) {
      await this.sendAck(config, 'Кролик не найден.');
      return;
    }

    await this.sendAck(config, `Кролик ${rabbit.name} теперь в клетке.`);
  }

  private async handleFreeRoamingAction(
    config: Pick<
      HandleTelegramRabbitCallbackArgs,
      'rabbitId' | 'chatId' | 'replyToMessageId'
    >,
  ): Promise<void> {
    const { rabbitId } = config;

    const rabbit = await this.rabbitStorage.updateRabbit({
      rabbitId,
      allocation: RabbitAllocation.FREE_ROAMING,
    });

    if (!rabbit) {
      await this.sendAck(config, 'Кролик не найден.');
      return;
    }

    await this.sendAck(config, `Кролик ${rabbit.name} теперь выпущен.`);
  }

  private async handleTelegramRabbitCallback(
    config: HandleTelegramRabbitCallbackArgs,
  ): Promise<void> {
    const { rabbitId, action } = config;

    this.logger.debug(config, 'Telegram rabbit callback');

    const locked =
      await this.rabbitStorage.acquireTelegramCallbackLock(rabbitId);

    if (!locked) {
      await this.sendAck(
        config,
        'По этому кролику запрос уже обрабатывается. Подождите несколько секунд.',
      );
      return;
    }

    try {
      const existing = await this.rabbitStorage.getRabbitById(rabbitId);

      if (!existing) {
        await this.sendAck(
          config,
          action === TelegramCallbackAction.KILL
            ? 'Кролик не найден (возможно, уже пристрелен).'
            : 'Кролик не найден.',
        );
        return;
      }

      if (existing.allocation === RabbitAllocation.FREE_ROAMING) {
        await this.sendAck(
          config,
          'Извините, не получится. Кролик уже выпущен, теперь его не найти.',
        );
        return;
      }

      if (action === TelegramCallbackAction.KILL) {
        await this.handleKillAction({ ...config, existing });
        return;
      }

      if (action === TelegramCallbackAction.IN_CAGE) {
        await this.handleInCageAction({ ...config, existing });
        return;
      }

      await this.handleFreeRoamingAction(config);
    } finally {
      await this.rabbitStorage.releaseTelegramCallbackLock(rabbitId);
    }
  }

  async handle(msg: amqp.ConsumeMessage, ch: amqp.Channel): Promise<void> {
    const routingKeyMsg = msg.fields.routingKey;
    const parsed =
      this.rabbitMqConsumeMessageParseService.parseConsumeMessageBody(
        msg,
        parseTelegramCallbackPayload,
      );

    if (isParseConsumeMessageBodyFailure(parsed)) {
      if (parsed.reason === 'invalid_json') {
        this.logger.warn(
          { routingKey: routingKeyMsg },
          'Telegram callback message is not valid JSON, skipping',
        );
      } else {
        this.logger.warn(
          { routingKey: routingKeyMsg },
          'Telegram callback payload is invalid, skipping',
        );
      }
      ch.ack(msg);
      return;
    }

    const payload = parsed.data;

    try {
      await executeWithConsumeRetry(
        {
          maxAttempts: this.rabbitMqConsumeRetrySettings.consumeMaxAttempts,
          logger: this.logger,
          contextLabel: `Telegram callback: rabbitId=${payload.rabbitId} action=${payload.action}`,
        },
        () => this.handleTelegramRabbitCallback(payload),
      );

      this.logger.log(
        {
          rabbitId: payload.rabbitId,
          action: payload.action,
          routingKey: routingKeyMsg,
        },
        'Telegram callback: обработка сообщения успешно завершена',
      );

      ch.ack(msg);
    } catch {
      ch.nack(msg, false, false);
    }
  }
}
