import type * as amqp from 'amqplib';
import { RabbitMqConsumeMessageParseService } from './rabbitmq.consume.message.parse.service';

describe('RabbitMqConsumeMessageParseService', () => {
  const service = new RabbitMqConsumeMessageParseService();

  it('should return invalid_json when body is not valid JSON', () => {
    const msg = {
      content: Buffer.from('{'),
    } as amqp.ConsumeMessage;

    expect(
      service.parseConsumeMessageBody(msg, () => ({ x: 1 })),
    ).toEqual({
      ok: false,
      reason: 'invalid_json',
    });
  });

  it('should return invalid_payload when validator returns null', () => {
    const msg = {
      content: Buffer.from('{"a":1}'),
    } as amqp.ConsumeMessage;

    expect(service.parseConsumeMessageBody(msg, () => null)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
  });

  it('should return data when JSON and validator succeed', () => {
    const msg = {
      content: Buffer.from('{"k":true}'),
    } as amqp.ConsumeMessage;

    expect(
      service.parseConsumeMessageBody(msg, (p) =>
        typeof p === 'object' &&
        p !== null &&
        (p as { k?: boolean }).k === true
          ? { typed: 1 as const }
          : null,
      ),
    ).toEqual({ ok: true, data: { typed: 1 } });
  });
});
