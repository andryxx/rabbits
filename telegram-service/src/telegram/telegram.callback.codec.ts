import { isUUID } from 'class-validator';

type TelegramCallbackAction = 'IN_CAGE' | 'FREE_ROAMING' | 'KILL';

const CODE_TO_ACTION: Record<string, TelegramCallbackAction> = {
  c: 'IN_CAGE',
  f: 'FREE_ROAMING',
  k: 'KILL',
};

export function encodeTelegramRabbitCallbackData(
  rabbitId: string,
  code: 'c' | 'f' | 'k',
): string {
  return `${code}:${rabbitId}`;
}

export function decodeTelegramRabbitCallbackData(
  data: string,
): { rabbitId: string; action: TelegramCallbackAction } | null {
  const idx = data.indexOf(':');

  if (idx <= 0 || idx >= data.length - 1) {
    return null;
  }

  const code = data.slice(0, idx);
  const rabbitId = data.slice(idx + 1);

  if (!isUUID(rabbitId)) return null;

  const action = CODE_TO_ACTION[code];
  if (!action) return null;

  return { rabbitId, action };
}
