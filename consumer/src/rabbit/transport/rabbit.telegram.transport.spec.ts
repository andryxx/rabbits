import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqBrokerService } from '../../rabbitmq/rabbitmq.broker.service';
import { RabbitMqConsumerService } from '../../rabbitmq/rabbitmq.consumer.service';
import { TelegramCallbackHandler } from './telegram.callback.handler';
import { RabbitTelegramTransport } from './rabbit.telegram.transport';

describe('RabbitTelegramTransport', () => {
  it('should reject publish when broker URL is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_amqpUrl: '' })],
        }),
      ],
      providers: [
        RabbitMqBrokerService,
        {
          provide: RabbitMqConsumerService,
          useValue: {
            runTopicConsumer: jest.fn(),
          },
        },
        {
          provide: TelegramCallbackHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitTelegramTransport,
      ],
    }).compile();

    const broker = module.get<RabbitMqBrokerService>(RabbitMqBrokerService);
    const transport = module.get<RabbitTelegramTransport>(
      RabbitTelegramTransport,
    );

    await broker.onModuleInit();
    await transport.onModuleInit();

    await expect(
      transport.publish({ payload: { test: true } }),
    ).rejects.toThrow('Telegram RabbitMQ publisher is not initialized');

    await transport.onModuleDestroy();
    await broker.onModuleDestroy();
  });
});
