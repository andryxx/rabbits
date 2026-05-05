import { parseTelegramDirectMessage } from './telegram.direct.notify.parser';

describe('parseTelegramDirectMessage', () => {
  it('should parse valid payload', () => {
    expect(
      parseTelegramDirectMessage({
        kind: 'direct_message',
        chatId: '12345',
        text: 'hello',
      }),
    ).toEqual({ chatId: '12345', text: 'hello' });
  });

  it('should accept negative chat ids', () => {
    expect(
      parseTelegramDirectMessage({
        kind: 'direct_message',
        chatId: '-1001234567890',
        text: 'x',
      }),
    ).toEqual({ chatId: '-1001234567890', text: 'x' });
  });

  it('should parse reply target', () => {
    expect(
      parseTelegramDirectMessage({
        kind: 'direct_message',
        chatId: '1',
        text: 'ok',
        replyToMessageId: 99,
      }),
    ).toEqual({
      chatId: '1',
      text: 'ok',
      replyToMessageId: 99,
    });
  });

  it('should reject invalid payloads', () => {
    expect(parseTelegramDirectMessage(null)).toBeNull();
    expect(parseTelegramDirectMessage({ kind: 'other' })).toBeNull();
    expect(
      parseTelegramDirectMessage({
        kind: 'direct_message',
        chatId: 'abc',
        text: 'x',
      }),
    ).toBeNull();
    expect(
      parseTelegramDirectMessage({
        kind: 'direct_message',
        chatId: '1',
        text: 'x',
        replyToMessageId: 0,
      }),
    ).toBeNull();
  });
});
