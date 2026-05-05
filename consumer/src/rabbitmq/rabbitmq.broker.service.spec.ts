import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqBrokerService } from './rabbitmq.broker.service';

describe('RabbitMqBrokerService', () => {
  it('should not connect when URL is empty', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_amqpUrl: '' })],
        }),
      ],
      providers: [RabbitMqBrokerService],
    }).compile();

    const broker = module.get<RabbitMqBrokerService>(RabbitMqBrokerService);
    await broker.onModuleInit();

    expect(broker.isAvailable()).toBe(false);

    await broker.onModuleDestroy();
  });
});
