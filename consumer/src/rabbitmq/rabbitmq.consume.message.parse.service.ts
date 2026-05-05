import { Injectable } from '@nestjs/common';
import type * as amqp from 'amqplib';

export type ParseConsumeMessageBodyFailReason =
  | 'invalid_json'
  | 'invalid_payload';

export type ParseConsumeMessageBodySuccess<T> = {
  ok: true;
  data: T;
};

export type ParseConsumeMessageBodyFailure = {
  ok: false;
  reason: ParseConsumeMessageBodyFailReason;
};

export type ParseConsumeMessageBodyResult<T> =
  | ParseConsumeMessageBodySuccess<T>
  | ParseConsumeMessageBodyFailure;

export function isParseConsumeMessageBodyFailure<T>(
  parsed: ParseConsumeMessageBodyResult<T>,
): parsed is ParseConsumeMessageBodyFailure {
  return parsed.ok === false;
}

@Injectable()
export class RabbitMqConsumeMessageParseService {
  parseConsumeMessageBody<T>(
    msg: amqp.ConsumeMessage,
    validate: (parsed: unknown) => T | null,
  ): ParseConsumeMessageBodyResult<T> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(msg.content.toString()) as unknown;
    } catch {
      return { ok: false as const, reason: 'invalid_json' };
    }

    const data = validate(parsed);

    if (data === null) {
      return { ok: false as const, reason: 'invalid_payload' };
    }

    return { ok: true as const, data };
  }
}
