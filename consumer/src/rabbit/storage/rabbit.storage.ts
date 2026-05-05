import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { RabbitDto } from '../types/rabbit.dto';
import { CreateRabbitResult } from '../types/create.rabbit.result';
import { CreateRabbitArgs } from '../types/create.rabbit.args';
import { DeleteRabbitArgs } from '../types/delete.rabbit.args';
import { UpdateRabbitArgs } from '../types/update.rabbit.args';
import { SearchRabbitsArgs } from '../types/search.rabbits.args';
import { RabbitColor } from '../types/rabbit.color.enum';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';
import { RabbitPopulationStatsDto } from '../types/rabbit.population.stats.dto';
import { v7 as uuidv7 } from 'uuid';

const RABBIT_IDS_SET = 'rabbit:ids';
const RABBIT_STATS_BORN_KEY = 'rabbit:stats:born_total';
const RABBIT_STATS_KILLED_KEY = 'rabbit:stats:killed_total';
const RABBIT_TELEGRAM_CALLBACK_LOCK_PREFIX = 'rabbit:telegram_callback_lock:';
const RABBIT_TELEGRAM_CALLBACK_LOCK_TTL_SEC = 120;

function rabbitIdKey(id: string): string {
  return `rabbit:id:${id}`;
}

function rabbitNameIndexKey(name: string): string {
  return `rabbit:name:${name.toLowerCase()}`;
}

interface RabbitRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  age: number;
  name: string;
  color: string;
  allocation?: string;
  speed: number;
  isHungry: boolean;
  description?: string;
}

@Injectable()
export class RabbitStorage {
  constructor(private readonly redisService: RedisService) {}

  async createRabbit(config: CreateRabbitArgs): Promise<CreateRabbitResult> {
    const redis = this.redisService.getClient();
    const { age, name, color, speed, isHungry, description, allocation } =
      config;
    const id = config.id ?? uuidv7();
    const idKey = rabbitIdKey(id);
    const existingRaw = await redis.get(idKey);

    if (existingRaw) {
      return {
        outcome: 'duplicate_id',
        rabbit: this.recordToDto(JSON.parse(existingRaw) as RabbitRecord),
      };
    }

    const createdAt = config.createdAt ?? new Date().toISOString();
    const updatedAt = config.updatedAt ?? createdAt;
    const nameKey = rabbitNameIndexKey(name);

    const reserved = await redis.set(nameKey, id, 'NX');

    if (reserved !== 'OK') {
      const otherId = await redis.get(nameKey);

      if (otherId === id) {
        const retryRaw = await redis.get(idKey);

        if (retryRaw) {
          return {
            outcome: 'duplicate_id',
            rabbit: this.recordToDto(JSON.parse(retryRaw) as RabbitRecord),
          };
        }
      }

      return { outcome: 'name_conflict', rabbit: null };
    }

    const record: RabbitRecord = {
      id,
      createdAt,
      updatedAt,
      age,
      name,
      color,
      allocation: allocation ?? RabbitAllocation.JUST_BORN,
      speed,
      isHungry,
    };

    if (description !== undefined) {
      record.description = description;
    }

    try {
      await redis.set(idKey, JSON.stringify(record));
      await redis.sadd(RABBIT_IDS_SET, id);
      await redis.incr(RABBIT_STATS_BORN_KEY);
    } catch (err) {
      await redis.del(nameKey);
      throw err;
    }

    return {
      outcome: 'created',
      rabbit: this.recordToDto(record),
    };
  }

  async updateRabbit(config: UpdateRabbitArgs): Promise<RabbitDto | null> {
    const redis = this.redisService.getClient();
    const {
      rabbitId,
      age,
      name,
      color,
      speed,
      isHungry,
      description,
      allocation,
    } = config;
    const idKey = rabbitIdKey(rabbitId);
    const raw = await redis.get(idKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RabbitRecord;
    const nextName = name !== undefined ? name : parsed.name;

    if (nextName.toLowerCase() !== parsed.name.toLowerCase()) {
      const newKey = rabbitNameIndexKey(nextName);
      const existingId = await redis.get(newKey);
      if (existingId && existingId !== rabbitId) {
        return null;
      }
      await redis.del(rabbitNameIndexKey(parsed.name));
      await redis.set(newKey, rabbitId);
    }

    const updated: RabbitRecord = {
      ...parsed,
      name: nextName,
      age: age !== undefined ? age : parsed.age,
      color: color !== undefined ? color : parsed.color,
      allocation:
        allocation !== undefined
          ? allocation
          : (parsed.allocation ?? RabbitAllocation.JUST_BORN),
      speed: speed !== undefined ? speed : parsed.speed,
      isHungry: isHungry !== undefined ? isHungry : parsed.isHungry,
      updatedAt: new Date().toISOString(),
    };

    if (description !== undefined) {
      updated.description = description;
    }

    await redis.set(idKey, JSON.stringify(updated));

    return this.recordToDto(updated);
  }

  async deleteRabbit(config: DeleteRabbitArgs): Promise<boolean> {
    const redis = this.redisService.getClient();
    const { rabbitId } = config;
    const idKey = rabbitIdKey(rabbitId);
    const raw = await redis.get(idKey);

    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as RabbitRecord;
    const nameKey = rabbitNameIndexKey(parsed.name);

    await redis.del(nameKey);
    await redis.del(idKey);
    await redis.srem(RABBIT_IDS_SET, rabbitId);

    return true;
  }

  async deleteAllRabbits(): Promise<void> {
    const redis = this.redisService.getClient();
    const ids = await redis.smembers(RABBIT_IDS_SET);

    for (const rabbitId of ids) {
      await this.deleteRabbit({ rabbitId });
    }

    await redis.del(RABBIT_IDS_SET);
    await redis.del(RABBIT_STATS_BORN_KEY, RABBIT_STATS_KILLED_KEY);
  }

  async acquireTelegramCallbackLock(rabbitId: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const key = `${RABBIT_TELEGRAM_CALLBACK_LOCK_PREFIX}${rabbitId}`;
    const ok = await redis.set(
      key,
      '1',
      'EX',
      RABBIT_TELEGRAM_CALLBACK_LOCK_TTL_SEC,
      'NX',
    );

    return ok === 'OK';
  }

  async releaseTelegramCallbackLock(rabbitId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.del(`${RABBIT_TELEGRAM_CALLBACK_LOCK_PREFIX}${rabbitId}`);
  }

  async incrKilledTotal(): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.incr(RABBIT_STATS_KILLED_KEY);
  }

  async getRabbitPopulationStats(): Promise<RabbitPopulationStatsDto> {
    const redis = this.redisService.getClient();

    const bornRaw = await redis.get(RABBIT_STATS_BORN_KEY);
    const killedRaw = await redis.get(RABBIT_STATS_KILLED_KEY);
    const bornTotal = bornRaw !== null ? Number(bornRaw) || 0 : 0;
    const killedTotal = killedRaw !== null ? Number(killedRaw) || 0 : 0;

    const all = await this.searchRabbits({});
    let inCage = 0;
    let freeRoaming = 0;

    for (const r of all) {
      if (r.allocation === RabbitAllocation.IN_CAGE) {
        inCage++;
      } else if (r.allocation === RabbitAllocation.FREE_ROAMING) {
        freeRoaming++;
      }
    }

    return { bornTotal, inCage, freeRoaming, killedTotal };
  }

  async getRabbitById(rabbitId: string): Promise<RabbitDto | null> {
    const redis = this.redisService.getClient();
    const raw = await redis.get(rabbitIdKey(rabbitId));

    if (!raw) {
      return null;
    }

    return this.recordToDto(JSON.parse(raw) as RabbitRecord);
  }

  async searchRabbits(config: SearchRabbitsArgs): Promise<RabbitDto[]> {
    const redis = this.redisService.getClient();
    const {
      limit: take,
      offset: skip = 0,
      name,
      color,
      age,
      speed,
      isHungry,
    } = config;

    const ids = await redis.smembers(RABBIT_IDS_SET);
    const rows: RabbitRecord[] = [];

    for (const id of ids) {
      const rowRaw = await redis.get(rabbitIdKey(id));
      if (!rowRaw) {
        continue;
      }

      rows.push(JSON.parse(rowRaw) as RabbitRecord);
    }

    let filtered = rows;

    if (name !== undefined && name !== '') {
      const needle = name.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(needle));
    }

    if (color !== undefined) {
      filtered = filtered.filter((r) => r.color === color);
    }

    if (age !== undefined) {
      filtered = filtered.filter((r) => r.age === age);
    }

    if (speed !== undefined) {
      filtered = filtered.filter((r) => r.speed === speed);
    }

    if (isHungry !== undefined) {
      filtered = filtered.filter((r) => r.isHungry === isHungry);
    }

    filtered.sort((a, b) => {
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (diff !== 0) {
        return diff;
      }
      return a.name.localeCompare(b.name);
    });

    const slice =
      take === undefined
        ? filtered.slice(skip)
        : filtered.slice(skip, skip + take);

    return slice.map((r) => this.recordToDto(r));
  }

  async getRabbitByName(name: string): Promise<RabbitDto | null> {
    const redis = this.redisService.getClient();
    const id = await redis.get(rabbitNameIndexKey(name));

    if (!id) {
      return null;
    }

    const raw = await redis.get(rabbitIdKey(id));

    if (!raw) {
      return null;
    }

    return this.recordToDto(JSON.parse(raw) as RabbitRecord);
  }

  private recordToDto(record: RabbitRecord): RabbitDto {
    return new RabbitDto({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      age: record.age,
      name: record.name,
      color: record.color as RabbitColor,
      allocation: (record.allocation ??
        RabbitAllocation.JUST_BORN) as RabbitAllocation,
      speed: record.speed,
      isHungry: record.isHungry,
      description: record.description,
    });
  }
}
