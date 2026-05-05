import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitController } from './rabbit.controller';
import { RabbitService } from '../services/rabbit.service';
describe('RabbitController', () => {
  let rabbitController: RabbitController;
  let mockRabbitService: DeepMocked<RabbitService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RabbitController],
    })
      .useMocker(createMock)
      .compile();

    rabbitController = module.get<RabbitController>(RabbitController);
    mockRabbitService = module.get(RabbitService);
  });

  it('should be defined', () => {
    expect(rabbitController).toBeDefined();
  });

  describe('getRabbitById', () => {
    it('should call service get method', async () => {
      await rabbitController.getRabbitById('rabbit-id');

      expect(mockRabbitService.getRabbitByIdOrThrow).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchRabbits', () => {
    it('should call service search method', async () => {
      await rabbitController.searchRabbits({
        limit: 10,
        offset: 0,
      });

      expect(mockRabbitService.searchRabbits).toHaveBeenCalledTimes(1);
    });
  });

  describe('shootThemAll', () => {
    it('should call service deleteAllRabbits', async () => {
      await rabbitController.shootThemAll();

      expect(mockRabbitService.deleteAllRabbits).toHaveBeenCalledTimes(1);
    });
  });
});
