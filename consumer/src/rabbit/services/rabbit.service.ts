import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RabbitDto } from '../types/rabbit.dto';
import { CreateRabbitResult } from '../types/create.rabbit.result';
import { CreateRabbitArgs } from '../types/create.rabbit.args';
import { UpdateRabbitArgs } from '../types/update.rabbit.args';
import { SearchRabbitsArgs } from '../types/search.rabbits.args';
import { RabbitStorage } from '../storage/rabbit.storage';

@Injectable()
export class RabbitService {
  private readonly logger = new Logger(RabbitService.name);

  constructor(private readonly rabbitStorage: RabbitStorage) {}

  async createRabbit(config: CreateRabbitArgs): Promise<RabbitDto> {
    this.logger.debug(config, 'Creating rabbit');

    const result = await this.rabbitStorage.createRabbit(config);

    if (result.outcome === 'name_conflict') {
      throw new ConflictException('Rabbit with this name already exists');
    }

    if (result.outcome === 'duplicate_id') {
      throw new ConflictException('Rabbit with this id already exists');
    }

    this.logger.debug({ rabbitId: result.rabbit!.id }, 'Rabbit created');

    return result.rabbit!;
  }

  async updateRabbit(config: UpdateRabbitArgs): Promise<RabbitDto> {
    const { rabbitId, name, age, color, speed, isHungry, description } = config;

    this.logger.debug(
      { rabbitId, name, age, color, speed, isHungry, description },
      'Updating rabbit',
    );

    await this.getRabbitByIdOrThrow(rabbitId);

    if (name !== undefined) {
      const other = await this.rabbitStorage.getRabbitByName(name);
      if (other && other.id !== rabbitId) {
        throw new ConflictException('Rabbit with this name already exists');
      }
    }

    const rabbit = await this.rabbitStorage.updateRabbit(config);

    if (!rabbit) {
      throw new NotFoundException('Rabbit is not found');
    }

    this.logger.debug({ rabbitId }, 'Rabbit updated');

    return rabbit;
  }

  async deleteAllRabbits(): Promise<void> {
    this.logger.debug('Deleting all rabbits');

    await this.rabbitStorage.deleteAllRabbits();

    this.logger.debug('All rabbits deleted');
  }

  async getRabbitById(rabbitId: string): Promise<RabbitDto | null> {
    this.logger.debug({ rabbitId }, 'Getting rabbit by id');

    return await this.rabbitStorage.getRabbitById(rabbitId);
  }

  async getRabbitByIdOrThrow(rabbitId: string): Promise<RabbitDto> {
    this.logger.debug({ rabbitId }, 'Getting rabbit by id or throw');

    const rabbit = await this.getRabbitById(rabbitId);

    if (!rabbit) {
      throw new NotFoundException('Rabbit is not found');
    }

    return rabbit;
  }

  async searchRabbits(config: SearchRabbitsArgs): Promise<RabbitDto[]> {
    this.logger.debug(config, 'Searching rabbits');

    const rabbits = await this.rabbitStorage.searchRabbits(config);

    this.logger.debug({ count: rabbits.length }, 'Rabbits found');

    return rabbits;
  }

  async persistBornRabbitFromQueue(
    config: CreateRabbitArgs,
  ): Promise<CreateRabbitResult> {
    this.logger.debug(config, 'Persisting born rabbit from queue');

    return await this.rabbitStorage.createRabbit(config);
  }
}
