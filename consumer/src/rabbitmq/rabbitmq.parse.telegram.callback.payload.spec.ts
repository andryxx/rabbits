import { parseTelegramCallbackPayload } from './rabbitmq.parse.telegram.callback.payload';

const SAMPLE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('parseTelegramCallbackPayload', () => {
  it('should parse valid payloads', () => {
    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'IN_CAGE',
        chatId: '12345',
      }),
    ).toEqual({ rabbitId: SAMPLE_ID, action: 'IN_CAGE', chatId: '12345' });

    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'FREE_ROAMING',
        chatId: '-100',
      }),
    ).toEqual({
      rabbitId: SAMPLE_ID,
      action: 'FREE_ROAMING',
      chatId: '-100',
    });

    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'KILL',
        chatId: '1',
        replyToMessageId: 42,
      }),
    ).toEqual({
      rabbitId: SAMPLE_ID,
      action: 'KILL',
      chatId: '1',
      replyToMessageId: 42,
    });
  });

  it('should reject invalid payloads', () => {
    expect(parseTelegramCallbackPayload(null)).toBeNull();
    expect(parseTelegramCallbackPayload({})).toBeNull();
    expect(
      parseTelegramCallbackPayload({
        rabbitId: 'bad',
        action: 'IN_CAGE',
        chatId: '1',
      }),
    ).toBeNull();
    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'OTHER',
        chatId: '1',
      }),
    ).toBeNull();
    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'IN_CAGE',
      }),
    ).toBeNull();
    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'IN_CAGE',
        chatId: 'bad',
      }),
    ).toBeNull();
    expect(
      parseTelegramCallbackPayload({
        rabbitId: SAMPLE_ID,
        action: 'IN_CAGE',
        chatId: '1',
        replyToMessageId: 0,
      }),
    ).toBeNull();
  });
});
