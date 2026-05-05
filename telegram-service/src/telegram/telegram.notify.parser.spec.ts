import { parseTelegramNotifyMessage } from './telegram.notify.parser';

describe('parseTelegramNotifyMessage', () => {
  it('should format born rabbit with rabbitId', () => {
    const result = parseTelegramNotifyMessage({
      color: 'GREY',
      name: 'Fluffy',
      rabbitId: '11111111-1111-5111-8111-111111111111',
    });

    expect(result?.text).toBe('Родился серый кролик Fluffy');
    expect(result?.rabbitId).toBe('11111111-1111-5111-8111-111111111111');
  });

  it('should omit rabbitId when invalid uuid', () => {
    const result = parseTelegramNotifyMessage({
      color: 'WHITE',
      name: 'X',
      rabbitId: 'bad',
    });

    expect(result?.rabbitId).toBeUndefined();
  });

  it('should fall back to raw color when unknown', () => {
    expect(
      parseTelegramNotifyMessage({
        color: 'BLUE',
        name: 'X',
        rabbitId: '22222222-2222-5222-8222-222222222222',
      })?.text,
    ).toBe('Родился BLUE кролик X');
  });

  it('should accept legacy text payload', () => {
    expect(parseTelegramNotifyMessage({ text: 'hello' })).toEqual({
      text: 'hello',
    });
  });

  it('should reject invalid payload', () => {
    expect(parseTelegramNotifyMessage({})).toBeNull();
    expect(parseTelegramNotifyMessage(null)).toBeNull();
  });
});
