import { Test, TestingModule } from '@nestjs/testing';
import { RabbitService } from './rabbit.service';
import { RabbitPublisherTransport } from '../transport/rabbit.publisher.transport';
import { RabbitColor } from '../types/rabbit.color.enum';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';

describe('RabbitService', () => {
  let rabbitService: RabbitService;
  let mockPublisher: jest.Mocked<Pick<RabbitPublisherTransport, 'publish'>>;

  beforeEach(async () => {
    mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitService,
        { provide: RabbitPublisherTransport, useValue: mockPublisher },
      ],
    }).compile();

    rabbitService = module.get<RabbitService>(RabbitService);
  });

  it('should be defined', () => {
    expect(rabbitService).toBeDefined();
  });

  describe('bornRabbit', () => {
    it('should publish with deterministic id', async () => {
      await rabbitService.bornRabbit({
        age: 1,
        name: 'x',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      });

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      const body = mockPublisher.publish.mock.calls[0][0] as {
        payload: { id: string };
      };

      expect(body.payload.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(body.payload).not.toHaveProperty('idempotencyKey');
    });

    it('should return same id for identical payloads', async () => {
      const args = {
        age: 1,
        name: 'x',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      };

      const first = await rabbitService.bornRabbit(args);
      const second = await rabbitService.bornRabbit(args);

      expect(first.id).toBe(second.id);

      const pubFirst = mockPublisher.publish.mock.calls[0][0] as {
        payload: { id: string };
      };
      const pubSecond = mockPublisher.publish.mock.calls[1][0] as {
        payload: { id: string };
      };

      expect(pubFirst.payload.id).toBe(pubSecond.payload.id);
    });

    it('should treat missing allocation same as JUST_BORN for deterministic id', async () => {
      const base = {
        age: 1,
        name: 'x',
        color: RabbitColor.GREY,
        speed: 1,
        isHungry: false,
      };

      await rabbitService.bornRabbit(base);
      await rabbitService.bornRabbit({
        ...base,
        allocation: RabbitAllocation.JUST_BORN,
      });

      const first = mockPublisher.publish.mock.calls[0][0] as {
        payload: { id: string };
      };
      const second = mockPublisher.publish.mock.calls[1][0] as {
        payload: { id: string };
      };

      expect(first.payload.id).toBe(second.payload.id);
    });
  });
});
