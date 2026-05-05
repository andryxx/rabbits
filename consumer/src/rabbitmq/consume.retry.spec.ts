import { Logger } from '@nestjs/common';
import {
  executeWithConsumeRetry,
  ExecuteWithConsumeRetryArgs,
  resolveConsumeMaxAttempts,
} from './consume.retry';

describe('executeWithConsumeRetry', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test');
    jest.spyOn(logger, 'log').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
  });

  const args = (maxAttempts: number): ExecuteWithConsumeRetryArgs => ({
    maxAttempts,
    logger,
    contextLabel: 'ctx',
  });

  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue(42);

    await expect(
      executeWithConsumeRetry(args(3), fn),
    ).resolves.toBe(42);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      'ctx: успешно (попытка 1 из 3)',
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('retries then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockResolvedValueOnce('ok');

    await expect(
      executeWithConsumeRetry(args(3), fn),
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('throws after exhausting attempts', async () => {
    const err = new Error('fail');
    const fn = jest.fn().mockRejectedValue(err);

    await expect(
      executeWithConsumeRetry(args(2), fn),
    ).rejects.toThrow(err);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('resolveConsumeMaxAttempts', () => {
  it('defaults invalid values to 3', () => {
    expect(resolveConsumeMaxAttempts(undefined)).toBe(3);
    expect(resolveConsumeMaxAttempts('')).toBe(3);
    expect(resolveConsumeMaxAttempts('0')).toBe(3);
    expect(resolveConsumeMaxAttempts('x')).toBe(3);
  });

  it('parses valid bounded attempts', () => {
    expect(resolveConsumeMaxAttempts('1')).toBe(1);
    expect(resolveConsumeMaxAttempts('5')).toBe(5);
    expect(resolveConsumeMaxAttempts('99')).toBe(50);
  });
});
