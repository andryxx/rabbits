import { TelegramCallbackAction } from './telegram.callback.action.enum';

export interface HandleTelegramRabbitCallbackArgs {
  rabbitId: string;
  action: TelegramCallbackAction;
  chatId: string;
  replyToMessageId?: number;
}
