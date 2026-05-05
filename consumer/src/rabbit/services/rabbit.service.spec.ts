import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RabbitService } from './rabbit.service';
import { RabbitStorage } from '../storage/rabbit.storage';
import { RabbitColor } from '../types/rabbit.color.enum';

describe('RabbitService', () => {
  let rabbitService: RabbitService;
  let mockRabbitStorage: DeepMocked<RabbitStorage>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RabbitService],
    })
      .useMocker(createMock)
      .compile();

    rabbitService = module.get<RabbitService>(RabbitService);
    mockRabbitStorage = module.get(RabbitStorage);
  });

  it('should be defined', () => {
    expect(rabbitService).toBeDefined();
  });

  describe('createRabbit', () => {
    it('should call storage create method', async () => {
      await rabbitService.createRabbit({
        age: 0,
        name: 'x',
        color: RabbitColor.GREY,
        speed: 0,
        isHungry: false,
      });

      expect(mockRabbitStorage.createRabbit).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRabbit', () => {
    it('should throw NotFoundException if rabbit not found', async () => {
      mockRabbitStorage.getRabbitById.mockResolvedValueOnce(null);

      await expect(
        rabbitService.updateRabbit({ rabbitId: 'rabbit-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call storage update method', async () => {
      mockRabbitStorage.getRabbitById.mockResolvedValueOnce({
        id: 'rabbit-id',
      } as any);

      await rabbitService.updateRabbit({
        rabbitId: 'rabbit-id',
        age: 10,
      });

      expect(mockRabbitStorage.updateRabbit).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteAllRabbits', () => {
    it('should call storage deleteAllRabbits', async () => {
      await rabbitService.deleteAllRabbits();

      expect(mockRabbitStorage.deleteAllRabbits).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRabbitByIdOrThrow', () => {
    it('should throw NotFoundException if rabbit not found', async () => {
      mockRabbitStorage.getRabbitById.mockResolvedValueOnce(null);

      await expect(
        rabbitService.getRabbitByIdOrThrow('rabbit-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call storage get method', async () => {
      await rabbitService.getRabbitByIdOrThrow('rabbit-id');

      expect(mockRabbitStorage.getRabbitById).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchRabbits', () => {
    it('should call storage search method', async () => {
      await rabbitService.searchRabbits({});

      expect(mockRabbitStorage.searchRabbits).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistBornRabbitFromQueue', () => {
    it('should delegate to storage without throwing on conflict', async () => {
      mockRabbitStorage.createRabbit.mockResolvedValueOnce({
        outcome: 'name_conflict',
        rabbit: null,
      });

      const result = await rabbitService.persistBornRabbitFromQueue({
        id: 'aaaaaaaa-bbbb-5ccc-bbbb-aaaaaaaaaaaa',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        age: 1,
        name: 'q',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      expect(result.outcome).toBe('name_conflict');
      expect(mockRabbitStorage.createRabbit).toHaveBeenCalledTimes(1);
    });
  });
});
