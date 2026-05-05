import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { SendTelegramTextArgs } from '../types/send.telegram.text.args';
import { BroadcastBornNotificationArgs } from '../types/broadcast.born.notification.args';
import { TelegramSubscriberStorage } from '../storage/telegram.subscriber.storage';
import { TelegramCallbackPublisherTransport } from '../../transport/telegram.callback.publisher.transport';
import {
  decodeTelegramRabbitCallbackData,
  encodeTelegramRabbitCallbackData,
} from '../telegram.callback.codec';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Telegraf | null;

  constructor(
    private readonly config: ConfigService,
    private readonly telegramSubscriberStorage: TelegramSubscriberStorage,
    private readonly telegramCallbackPublisherTransport: TelegramCallbackPublisherTransport,
  ) {
    const token = this.config.get<string>('rabbit_telegramBotToken')?.trim();

    if (!token) {
      this.logger.warn(
        'rabbit_telegramBotToken is not set, outbound Telegram is disabled',
      );
      this.bot = null;
      return;
    }

    this.bot = new Telegraf(token);
    this.registerBotHandlers();
  }

  private getReplyToMessageId(callbackQuery: {
    message?: unknown;
  }): number | undefined {
    const message = callbackQuery?.message;

    if (
      !message ||
      typeof message !== 'object' ||
      !('message_id' in message) ||
      typeof message?.message_id !== 'number'
    ) {
      return undefined;
    }

    return message.message_id;
  }

  private registerBotHandlers(): void {
    if (!this.bot) {
      return;
    }

    this.bot.command('start', async (ctx) => {
      const chatId = ctx.chat?.id;

      if (chatId === undefined) {
        return;
      }

      await this.telegramSubscriberStorage.addSubscriber(String(chatId));

      await ctx.reply(
        'Подписка оформлена. Уведомления о новых кроликах будут приходить сюда.',
      );
    });

    this.bot.command('stop', async (ctx) => {
      const chatId = ctx.chat?.id;

      if (chatId === undefined) {
        return;
      }

      await this.telegramSubscriberStorage.removeSubscriber(String(chatId));

      await ctx.reply('Подписка отменена.');
    });

    this.bot.on('callback_query', async (ctx) => {
      await ctx.answerCbQuery();

      const raw =
        ctx.callbackQuery &&
        'data' in ctx.callbackQuery &&
        typeof ctx.callbackQuery.data === 'string'
          ? ctx.callbackQuery.data
          : undefined;

      if (!raw) {
        return;
      }

      const decoded = decodeTelegramRabbitCallbackData(raw);

      if (!decoded) {
        return;
      }

      const chatId = ctx.chat?.id;

      if (chatId === undefined) {
        return;
      }

      const replyToMessageId = this.getReplyToMessageId(ctx.callbackQuery);

      try {
        await this.telegramCallbackPublisherTransport.publish({
          payload: {
            rabbitId: decoded.rabbitId,
            action: decoded.action,
            chatId: String(chatId),
            ...(replyToMessageId !== undefined ? { replyToMessageId } : {}),
          },
        });
      } catch (err) {
        this.logger.warn(`Telegram callback publish failed: ${String(err)}`);
      }
    });
  }

  async onModuleInit(): Promise<void> {
    const bot = this.bot;

    if (!bot) {
      this.logger.warn(
        'Telegram bot not started (missing rabbit_telegramBotToken)',
      );
      return;
    }

    setImmediate(() => {
      setTimeout(async () => {
        try {
          await bot.launch();
          this.logger.log('Telegram bot polling started');
        } catch (err) {
          this.logger.error(`Telegram bot failed to start: ${String(err)}`);
        }
      }, 500);
    });
  }

  async onModuleDestroy(): Promise<void> {
    const bot = this.bot;

    if (bot) {
      try {
        bot.stop('Nest shutdown');
      } catch (err) {
        this.logger.warn(err);
      }
    }
  }

  async sendText(config: SendTelegramTextArgs): Promise<void> {
    const { chatId, text, replyToMessageId } = config;

    if (!this.bot) {
      this.logger.warn('Telegram bot is not configured, message skipped');
      return;
    }

    try {
      const extra =
        replyToMessageId !== undefined
          ? { reply_parameters: { message_id: replyToMessageId } }
          : {};

      await this.bot.telegram.sendMessage(chatId, text, extra);
      this.logger.log(`Telegram message sent to chat ${chatId}`);
    } catch (err) {
      this.logger.error(`Telegram sendMessage failed: ${String(err)}`);
      throw err;
    }
  }

  async broadcastText(text: string): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Telegram bot is not configured, broadcast skipped');
      return;
    }

    const ids = await this.telegramSubscriberStorage.getSubscriberChatIds();

    if (ids.length === 0) {
      this.logger.warn('No Telegram subscribers in Redis; broadcast skipped');
      return;
    }

    for (const chatId of ids) {
      try {
        await this.bot.telegram.sendMessage(chatId, text);
        this.logger.log(`Broadcast delivered to chat ${chatId}`);
      } catch (err) {
        this.logger.warn(`Broadcast failed for chat ${chatId}: ${String(err)}`);
      }
    }
  }

  async broadcastBornNotification(
    config: BroadcastBornNotificationArgs,
  ): Promise<void> {
    const { text, rabbitId } = config;

    if (!this.bot) {
      this.logger.warn(
        'Telegram bot is not configured, born broadcast skipped',
      );
      return;
    }

    const ids = await this.telegramSubscriberStorage.getSubscriberChatIds();

    if (ids.length === 0) {
      this.logger.warn('No Telegram subscribers in Redis; broadcast skipped');
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          'В клетку',
          encodeTelegramRabbitCallbackData(rabbitId, 'c'),
        ),
        Markup.button.callback(
          'Выпустить',
          encodeTelegramRabbitCallbackData(rabbitId, 'f'),
        ),
        Markup.button.callback(
          'Пристрелить',
          encodeTelegramRabbitCallbackData(rabbitId, 'k'),
        ),
      ],
    ]);

    for (const chatId of ids) {
      try {
        await this.bot.telegram.sendMessage(chatId, text, {
          reply_markup: keyboard.reply_markup,
        });
        this.logger.log(`Born notify delivered to chat ${chatId}`);
      } catch (err) {
        this.logger.warn(
          `Born notify failed for chat ${chatId}: ${String(err)}`,
        );
      }
    }
  }
}
