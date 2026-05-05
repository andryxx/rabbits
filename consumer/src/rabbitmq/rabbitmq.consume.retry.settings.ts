import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveConsumeMaxAttempts } from './consume.retry';

@Injectable()
export class RabbitMqConsumeRetrySettings {
  readonly consumeMaxAttempts: number;

  constructor(private readonly config: ConfigService) {
    this.consumeMaxAttempts = resolveConsumeMaxAttempts(
      this.config.get<string>('rabbit_consumeMaxAttempts'),
    );
  }
}
