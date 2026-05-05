import { isUUID } from 'class-validator';
import { HandleTelegramRabbitCallbackArgs } from '../rabbit/types/handle.telegram.rabbit.callback.args';
import { TelegramCallbackAction } from '../rabbit/types/telegram.callback.action.enum';

export function parseTelegramCallbackPayload(
  parsed: unknown,
): HandleTelegramRabbitCallbackArgs | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const o = parsed as Record<string, unknown>;

  if (!isUUID(o.rabbitId as string)) {
    return null;
  }

  if (
    typeof o.action !== 'string' ||
    !Object.values(TelegramCallbackAction).includes(
      o.action as TelegramCallbackAction,
    )
  ) {
    return null;
  }

  if (typeof o.chatId !== 'string' || !/^-?\d+$/.test(o.chatId)) {
    return null;
  }

  let replyToMessageId: number | undefined;

  if (o.replyToMessageId !== undefined) {
    if (
      typeof o.replyToMessageId !== 'number' ||
      !Number.isFinite(o.replyToMessageId) ||
      !Number.isInteger(o.replyToMessageId) ||
      o.replyToMessageId < 1
    ) {
      return null;
    }

    replyToMessageId = o.replyToMessageId;
  }

  return {
    rabbitId: o.rabbitId as string,
    action: o.action as HandleTelegramRabbitCallbackArgs['action'],
    chatId: o.chatId as string,
    replyToMessageId,
  };
}
