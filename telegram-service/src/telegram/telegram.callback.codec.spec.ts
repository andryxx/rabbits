import {
  decodeTelegramRabbitCallbackData,
  encodeTelegramRabbitCallbackData,
} from './telegram.callback.codec';

const SAMPLE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('telegram.callback.codec', () => {
  it('should encode and decode cage action', () => {
    const data = encodeTelegramRabbitCallbackData(SAMPLE_ID, 'c');

    expect(decodeTelegramRabbitCallbackData(data)).toEqual({
      rabbitId: SAMPLE_ID,
      action: 'IN_CAGE',
    });
  });

  it('should encode and decode free roam action', () => {
    const data = encodeTelegramRabbitCallbackData(SAMPLE_ID, 'f');

    expect(decodeTelegramRabbitCallbackData(data)).toEqual({
      rabbitId: SAMPLE_ID,
      action: 'FREE_ROAMING',
    });
  });

  it('should encode and decode kill action', () => {
    const data = encodeTelegramRabbitCallbackData(SAMPLE_ID, 'k');

    expect(decodeTelegramRabbitCallbackData(data)).toEqual({
      rabbitId: SAMPLE_ID,
      action: 'KILL',
    });
  });

  it('should reject invalid payload', () => {
    expect(decodeTelegramRabbitCallbackData('')).toBeNull();
    expect(decodeTelegramRabbitCallbackData('x')).toBeNull();
    expect(decodeTelegramRabbitCallbackData('c:not-a-uuid')).toBeNull();
    expect(
      decodeTelegramRabbitCallbackData(
        'z:a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ),
    ).toBeNull();
  });
});
