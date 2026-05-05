import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import { RabbitStorage } from './rabbit.storage';
import { RedisService } from '../../redis/redis.service';
import { RabbitColor } from '../types/rabbit.color.enum';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';

describe('RabbitStorage', () => {
  let rabbitStorage: RabbitStorage;
  let mockRedis: InstanceType<typeof RedisMock>;

  beforeEach(async () => {
    mockRedis = new RedisMock();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        RabbitStorage,
        {
          provide: RedisService,
          useValue: {
            getClient: () => mockRedis,
            onModuleDestroy: async () => {
              await mockRedis.quit();
            },
          },
        },
      ],
    }).compile();

    rabbitStorage = module.get<RabbitStorage>(RabbitStorage);
  });

  afterEach(async () => {
    await mockRedis.flushall();
    await mockRedis.quit();
  });

  it('should be defined', () => {
    expect(rabbitStorage).toBeDefined();
  });

  describe('createRabbit', () => {
    it('should create rabbit with all fields', async () => {
      const { outcome, rabbit } = await rabbitStorage.createRabbit({
        age: 8,
        name: 'Fluffy',
        color: RabbitColor.GREY,
        speed: 12.5,
        isHungry: true,
        description: 'Likes carrots',
      });

      expect(outcome).toBe('created');
      expect(rabbit!.name).toBe('Fluffy');
      expect(rabbit!.age).toBe(8);
      expect(rabbit!.color).toBe(RabbitColor.GREY);
      expect(rabbit!.speed).toBe(12.5);
      expect(rabbit!.isHungry).toBe(true);
      expect(rabbit!.description).toBe('Likes carrots');
      expect(rabbit!.allocation).toBe(RabbitAllocation.JUST_BORN);
      expect(rabbit!.id).toBeDefined();
      expect(rabbit!.createdAt).toBeDefined();
    });

    it('should persist allocation when set', async () => {
      const { outcome, rabbit } = await rabbitStorage.createRabbit({
        age: 1,
        name: 'Roam',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
        allocation: RabbitAllocation.FREE_ROAMING,
      });

      expect(outcome).toBe('created');
      expect(rabbit!.allocation).toBe(RabbitAllocation.FREE_ROAMING);
    });

    it('should return null if name already exists', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'Twin',
        color: RabbitColor.WHITE,
        speed: 5,
        isHungry: false,
      });

      const second = await rabbitStorage.createRabbit({
        age: 2,
        name: 'twin',
        color: RabbitColor.BLACK,
        speed: 6,
        isHungry: true,
      });

      expect(second.outcome).toBe('name_conflict');
      expect(second.rabbit).toBeNull();
    });

    it('should use preset id when provided', async () => {
      const fixedId = '11111111-1111-5111-8111-111111111111';

      const { outcome, rabbit } = await rabbitStorage.createRabbit({
        id: fixedId,
        createdAt: '2021-01-01T00:00:00.000Z',
        updatedAt: '2021-01-01T00:00:00.000Z',
        age: 3,
        name: 'Preset',
        color: RabbitColor.WHITE,
        speed: 4,
        isHungry: false,
      });

      expect(outcome).toBe('created');
      expect(rabbit!.id).toBe(fixedId);
    });

    it('should return existing rabbit when same id is supplied again', async () => {
      const fixedId = '22222222-2222-5222-8222-222222222222';

      const first = await rabbitStorage.createRabbit({
        id: fixedId,
        createdAt: '2021-01-01T00:00:00.000Z',
        updatedAt: '2021-01-01T00:00:00.000Z',
        age: 1,
        name: 'Dedup',
        color: RabbitColor.BLACK,
        speed: 2,
        isHungry: true,
      });

      const second = await rabbitStorage.createRabbit({
        id: fixedId,
        createdAt: '2099-01-01T00:00:00.000Z',
        updatedAt: '2099-01-01T00:00:00.000Z',
        age: 99,
        name: 'Dedup',
        color: RabbitColor.BLACK,
        speed: 2,
        isHungry: true,
      });

      expect(first.outcome).toBe('created');
      expect(second.outcome).toBe('duplicate_id');
      expect(second.rabbit!.id).toBe(first.rabbit!.id);
      expect(second.rabbit!.age).toBe(first.rabbit!.age);
    });

    it('should return null when preset id differs but name is taken', async () => {
      await rabbitStorage.createRabbit({
        id: '33333333-3333-5333-8333-333333333333',
        createdAt: '2021-01-01T00:00:00.000Z',
        updatedAt: '2021-01-01T00:00:00.000Z',
        age: 1,
        name: 'Taken',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      const clash = await rabbitStorage.createRabbit({
        id: '44444444-4444-5444-8444-444444444444',
        createdAt: '2021-01-01T00:00:00.000Z',
        updatedAt: '2021-01-01T00:00:00.000Z',
        age: 2,
        name: 'Taken',
        color: RabbitColor.GREY,
        speed: 2,
        isHungry: false,
      });

      expect(clash.outcome).toBe('name_conflict');
      expect(clash.rabbit).toBeNull();
    });
  });

  describe('deleteRabbit', () => {
    it('should remove rabbit by id', async () => {
      const created = await rabbitStorage.createRabbit({
        age: 1,
        name: 'Goner',
        color: RabbitColor.WHITE,
        speed: 1,
        isHungry: false,
      });

      expect(created.rabbit).toBeDefined();

      const removed = await rabbitStorage.deleteRabbit({
        rabbitId: created.rabbit!.id,
      });

      expect(removed).toBe(true);
      expect(await rabbitStorage.getRabbitById(created.rabbit!.id)).toBeNull();
      expect(
        await rabbitStorage.deleteRabbit({ rabbitId: created.rabbit!.id }),
      ).toBe(false);
    });
  });

  describe('deleteAllRabbits', () => {
    it('should remove every rabbit and index set', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'One',
        color: RabbitColor.WHITE,
        speed: 1,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 2,
        name: 'Two',
        color: RabbitColor.BLACK,
        speed: 2,
        isHungry: true,
      });

      expect((await rabbitStorage.searchRabbits({})).length).toBe(2);

      await rabbitStorage.incrKilledTotal();
      await rabbitStorage.incrKilledTotal();

      expect(await rabbitStorage.getRabbitPopulationStats()).toMatchObject({
        bornTotal: 2,
        killedTotal: 2,
      });

      await rabbitStorage.deleteAllRabbits();

      expect(await rabbitStorage.searchRabbits({})).toEqual([]);
      expect(await rabbitStorage.getRabbitPopulationStats()).toMatchObject({
        bornTotal: 0,
        killedTotal: 0,
        inCage: 0,
        freeRoaming: 0,
      });
    });
  });

  describe('telegram callback lock', () => {
    it('should grant lock exclusively until released', async () => {
      const id = 'aaaaaaaa-bbbb-5ccc-bbbb-aaaaaaaaaaaa';

      await expect(rabbitStorage.acquireTelegramCallbackLock(id)).resolves.toBe(
        true,
      );
      await expect(rabbitStorage.acquireTelegramCallbackLock(id)).resolves.toBe(
        false,
      );

      await rabbitStorage.releaseTelegramCallbackLock(id);

      await expect(rabbitStorage.acquireTelegramCallbackLock(id)).resolves.toBe(
        true,
      );

      await rabbitStorage.releaseTelegramCallbackLock(id);
    });
  });

  describe('updateRabbit', () => {
    it('should update rabbit fields', async () => {
      const created = await rabbitStorage.createRabbit({
        age: 3,
        name: 'Patch',
        color: RabbitColor.BROWN,
        speed: 7,
        isHungry: true,
      });

      const updated = await rabbitStorage.updateRabbit({
        rabbitId: created.rabbit!.id,
        age: 4,
        speed: 9,
        isHungry: false,
      });

      expect(updated.id).toBe(created.rabbit!.id);
      expect(updated.age).toBe(4);
      expect(updated.speed).toBe(9);
      expect(updated.isHungry).toBe(false);
      expect(updated.name).toBe('Patch');
    });
  });

  describe('getRabbitById', () => {
    it('should return rabbit if found', async () => {
      const created = await rabbitStorage.createRabbit({
        age: 5,
        name: 'ById',
        color: RabbitColor.BROWN,
        speed: 11,
        isHungry: false,
      });

      const rabbit = await rabbitStorage.getRabbitById(created.rabbit!.id);

      expect(rabbit).toBeDefined();
      expect(rabbit?.id).toBe(created.rabbit!.id);
      expect(rabbit?.name).toBe('ById');
    });

    it('should return null if rabbit not found', async () => {
      const result = await rabbitStorage.getRabbitById(
        '01940000-0000-7000-8000-000000000001',
      );

      expect(result).toBeNull();
    });
  });

  describe('getRabbitByName', () => {
    it('should return rabbit if found', async () => {
      const created = await rabbitStorage.createRabbit({
        age: 6,
        name: 'ByName',
        color: RabbitColor.WHITE,
        speed: 8,
        isHungry: true,
      });

      const rabbit = await rabbitStorage.getRabbitByName('byname');

      expect(rabbit).toBeDefined();
      expect(rabbit?.id).toBe(created.rabbit!.id);
    });
  });

  describe('searchRabbits', () => {
    it('should search rabbits by name', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'SEARCHME',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      const rabbits = await rabbitStorage.searchRabbits({
        name: 'search',
      });

      expect(rabbits.length).toBe(1);
      expect(rabbits[0].name).toBe('SEARCHME');
    });

    it('should support pagination', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'PAGE_A',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 1,
        name: 'PAGE_B',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      const firstPage = await rabbitStorage.searchRabbits({
        limit: 1,
        offset: 0,
      });

      expect(firstPage.length).toBe(1);

      const secondPage = await rabbitStorage.searchRabbits({
        limit: 1,
        offset: 1,
      });

      expect(secondPage.length).toBe(1);
    });

    it('should filter by color', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'R1',
        color: RabbitColor.WHITE,
        speed: 1,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 1,
        name: 'R2',
        color: RabbitColor.BLACK,
        speed: 1,
        isHungry: false,
      });

      const rabbits = await rabbitStorage.searchRabbits({
        color: RabbitColor.BLACK,
      });

      expect(rabbits.length).toBe(1);
      expect(rabbits[0].name).toBe('R2');
    });

    it('should filter by age', async () => {
      await rabbitStorage.createRabbit({
        age: 10,
        name: 'Old',
        color: RabbitColor.GREY,
        speed: 2,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 2,
        name: 'Young',
        color: RabbitColor.GREY,
        speed: 3,
        isHungry: true,
      });

      const rabbits = await rabbitStorage.searchRabbits({
        age: 10,
      });

      expect(rabbits.length).toBe(1);
      expect(rabbits[0].name).toBe('Old');
    });

    it('should filter by speed', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'Slow',
        color: RabbitColor.GREY,
        speed: 4.5,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 1,
        name: 'Fast',
        color: RabbitColor.GREY,
        speed: 20,
        isHungry: false,
      });

      const rabbits = await rabbitStorage.searchRabbits({
        speed: 4.5,
      });

      expect(rabbits.length).toBe(1);
      expect(rabbits[0].name).toBe('Slow');
    });

    it('should filter by isHungry', async () => {
      await rabbitStorage.createRabbit({
        age: 1,
        name: 'Fed',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      await rabbitStorage.createRabbit({
        age: 1,
        name: 'HungryOne',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: true,
      });

      const rabbits = await rabbitStorage.searchRabbits({
        isHungry: true,
      });

      expect(rabbits.length).toBe(1);
      expect(rabbits[0].name).toBe('HungryOne');
    });

    it('should return empty array if none match', async () => {
      const rabbits = await rabbitStorage.searchRabbits({
        name: 'nonexistent',
      });

      expect(rabbits.length).toBe(0);
    });
  });
});
