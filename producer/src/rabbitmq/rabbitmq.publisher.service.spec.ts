import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqPublisherService } from './rabbitmq.publisher.service';

describe('RabbitMqPublisherService', () => {
  it('should reject publishJson when broker URL is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_amqpUrl: '' })],
        }),
      ],
      providers: [RabbitMqPublisherService],
    }).compile();

    const svc = module.get<RabbitMqPublisherService>(RabbitMqPublisherService);
    await svc.onModuleInit();

    await expect(
      svc.publishJson({
        exchange: 'x',
        routingKey: 'k',
        payload: {},
      }),
    ).rejects.toThrow('RabbitMQ is not initialized');

    await svc.onModuleDestroy();
  });
});
