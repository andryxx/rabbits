export interface ParsedTelegramDirectMessage {
  chatId: string;
  text: string;
  replyToMessageId?: number;
}

export function parseTelegramDirectMessage(
  parsed: unknown,
): ParsedTelegramDirectMessage | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const o = parsed as Record<string, unknown>;

  if (o.kind !== 'direct_message') {
    return null;
  }

  if (typeof o.chatId !== 'string' || !/^-?\d+$/.test(o.chatId)) {
    return null;
  }

  if (typeof o.text !== 'string' || o.text.length === 0) {
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
    chatId: o.chatId,
    text: o.text,
    replyToMessageId,
  };
}
