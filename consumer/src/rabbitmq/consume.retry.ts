import { Logger } from '@nestjs/common';

export interface ExecuteWithConsumeRetryArgs {
  maxAttempts: number;
  logger: Logger;
  contextLabel: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attemptIndex: number): number {
  return Math.min(1000, 100 * 2 ** attemptIndex);
}

export function resolveConsumeMaxAttempts(raw: string | undefined): number {
  const n = raw !== undefined && raw !== '' ? parseInt(raw, 10) : NaN;

  return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 3;
}

export async function executeWithConsumeRetry<T>(
  config: ExecuteWithConsumeRetryArgs,
  fn: () => Promise<T>,
): Promise<T> {
  const { maxAttempts, logger, contextLabel } = config;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await fn();

      logger.log(
        `${contextLabel}: успешно (попытка ${attempt + 1} из ${maxAttempts})`,
      );

      return result;
    } catch (err) {
      lastError = err;

      logger.warn(
        `${contextLabel}: ошибка, попытка ${attempt + 1} из ${maxAttempts}: ${String(err)}`,
      );

      if (attempt < maxAttempts - 1) {
        await delay(backoffMs(attempt));
      }
    }
  }

  logger.error(
    `${contextLabel}: не удалось после ${maxAttempts} попыток: ${String(lastError)}`,
  );

  throw lastError;
}
