import { isUUID } from 'class-validator';
import { RABBIT_COLOR_RU } from './types/rabbit.color.ru.map';

export interface ParsedTelegramNotifyMessage {
  text: string;
  rabbitId?: string;
}

export function parseTelegramNotifyMessage(
  parsed: unknown,
): ParsedTelegramNotifyMessage | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const o = parsed as Record<string, unknown>;

  if (
    typeof o.color === 'string' &&
    typeof o.name === 'string' &&
    o.name.length > 0
  ) {
    const colorRu = RABBIT_COLOR_RU[o.color] ?? o.color;

    const text = `Родился ${colorRu} кролик ${o.name}`;

    if (typeof o.rabbitId === 'string' && isUUID(o.rabbitId)) {
      return { text, rabbitId: o.rabbitId };
    }

    return { text };
  }

  if (typeof o.text === 'string' && o.text.length > 0) {
    return { text: o.text };
  }

  return null;
}
