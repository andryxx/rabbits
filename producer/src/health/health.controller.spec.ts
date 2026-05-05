import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { version } from '../../package.json';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(healthController).toBeDefined();
  });

  describe('check', () => {
    it('should return version', () => {
      const result = healthController.check();

      expect(result).toEqual({ version });
    });
  });
});
