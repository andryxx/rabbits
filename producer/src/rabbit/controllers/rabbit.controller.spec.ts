import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitController } from './rabbit.controller';
import { RabbitService } from '../services/rabbit.service';
import { RabbitColor } from '../types/rabbit.color.enum';

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

  describe('bornRabbit', () => {
    it('should call service bornRabbit', async () => {
      await rabbitController.bornRabbit({
        age: 0,
        name: 'x',
        color: RabbitColor.GREY,
        speed: 0,
        isHungry: false,
      });

      expect(mockRabbitService.bornRabbit).toHaveBeenCalledTimes(1);
    });
  });
});
