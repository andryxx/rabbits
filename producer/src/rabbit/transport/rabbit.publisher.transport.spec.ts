import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqPublisherService } from '../../rabbitmq/rabbitmq.publisher.service';
import { RabbitPublisherTransport } from './rabbit.publisher.transport';

describe('RabbitPublisherTransport', () => {
  it('should reject publish when broker URL is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_amqpUrl: '' })],
        }),
      ],
      providers: [RabbitMqPublisherService, RabbitPublisherTransport],
    }).compile();

    const transport = module.get<RabbitPublisherTransport>(
      RabbitPublisherTransport,
    );
    await module.init();

    await expect(
      transport.publish({ payload: { test: true } }),
    ).rejects.toThrow('RabbitMQ publisher is not initialized');

    await module.close();
  });
});
