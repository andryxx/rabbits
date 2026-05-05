import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { BornRabbitArgs } from '../types/born.rabbit.args';
import { BornRabbitResponseDto } from '../types/born.rabbit.response.dto';
import { RabbitPublisherTransport } from '../transport/rabbit.publisher.transport';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';

const RABBIT_BORN_ID_NAMESPACE = '018fd220-4faf-7eef-a000-0000deadbeef';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableStringifyRecord(record: Record<string, unknown>): string {
  const sortedKeys = Object.keys(record).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sorted[key] = record[key];
  }
  return JSON.stringify(sorted);
}

function canonicalBornRecord(config: BornRabbitArgs): Record<string, unknown> {
  const allocation = config.allocation ?? RabbitAllocation.JUST_BORN;
  const record: Record<string, unknown> = {
    age: config.age,
    allocation,
    color: config.color,
    isHungry: config.isHungry,
    name: config.name,
    speed: config.speed,
  };
  if (config.description !== undefined) {
    record.description = config.description;
  }
  return record;
}

function bornPayloadIdempotencyKey(config: BornRabbitArgs): string {
  const canonical = stableStringifyRecord(canonicalBornRecord(config));
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

@Injectable()
export class RabbitService {
  private readonly logger = new Logger(RabbitService.name);

  constructor(
    private readonly rabbitPublisherTransport: RabbitPublisherTransport,
  ) {}

  async bornRabbit(config: BornRabbitArgs): Promise<BornRabbitResponseDto> {
    const payloadDigestHex = bornPayloadIdempotencyKey(config);
    const id = uuidv5(payloadDigestHex, RABBIT_BORN_ID_NAMESPACE);
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      id,
      createdAt: now,
      updatedAt: now,
      age: config.age,
      name: config.name,
      color: config.color,
      speed: config.speed,
      isHungry: config.isHungry,
      allocation: config.allocation ?? RabbitAllocation.JUST_BORN,
    };

    if (config.description !== undefined) {
      payload.description = config.description;
    }

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.rabbitPublisherTransport.publish({ payload });

        this.logger.debug({ rabbitId: id }, 'Rabbit message published');

        return new BornRabbitResponseDto({ id });
      } catch (err) {
        lastError = err;
        const backoffMs = Math.min(1000, 100 * 2 ** attempt);
        this.logger.warn(
          `Publish failed, attempt=${attempt + 1} backoffMs=${backoffMs}: ${String(err)}`,
        );
        await delay(backoffMs);
      }
    }

    this.logger.error(`Publish failed after retries: ${String(lastError)}`);

    throw new ServiceUnavailableException(
      'Message broker is unavailable, rabbit was not published',
    );
  }
}
