import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import type * as amqp from 'amqplib';
import { RabbitMqBrokerService } from '../../rabbitmq/rabbitmq.broker.service';
import { RabbitMqConsumerService } from '../../rabbitmq/rabbitmq.consumer.service';
import { RabbitsBornHandler } from './rabbits.born.handler';
import { RabbitRabbitsTransport } from './rabbit.rabbits.transport';

describe('RabbitRabbitsTransport', () => {
  it('should not subscribe when broker URL is not configured', async () => {
    const runTopicConsumer = jest.fn();

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
          useValue: { runTopicConsumer },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const broker = module.get<RabbitMqBrokerService>(RabbitMqBrokerService);
    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await broker.onModuleInit();
    await transport.onModuleInit();

    expect(runTopicConsumer).not.toHaveBeenCalled();

    await transport.onModuleDestroy();
    await broker.onModuleDestroy();
  });

  it('should subscribe with default exchange, routing key and queue when broker is available', async () => {
    const runTopicConsumer = jest.fn().mockResolvedValue({
      cancel: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
      ],
      providers: [
        {
          provide: RabbitMqBrokerService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RabbitMqConsumerService,
          useValue: { runTopicConsumer },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await transport.onModuleInit();

    expect(runTopicConsumer).toHaveBeenCalledTimes(1);
    expect(runTopicConsumer).toHaveBeenCalledWith({
      exchange: 'rabbits',
      routingKey: '#',
      queueName: 'rabbit.consumer.rabbits',
      consumerLogger: expect.any(Object),
      handleMessage: expect.any(Function),
    });

    await transport.onModuleDestroy();
  });

  it('should subscribe using rabbit_* config overrides', async () => {
    const runTopicConsumer = jest.fn().mockResolvedValue({
      cancel: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              rabbit_exchangeRabbits: 'ex-custom',
              rabbit_topicRoutingKey: 'born.test',
              rabbit_consumerQueue: 'q-custom',
            }),
          ],
        }),
      ],
      providers: [
        {
          provide: RabbitMqBrokerService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RabbitMqConsumerService,
          useValue: { runTopicConsumer },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await transport.onModuleInit();

    expect(runTopicConsumer).toHaveBeenCalledWith(
      expect.objectContaining({
        exchange: 'ex-custom',
        routingKey: 'born.test',
        queueName: 'q-custom',
      }),
    );

    await transport.onModuleDestroy();
  });

  it('should delegate handleMessage to RabbitsBornHandler.handle', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const runTopicConsumer = jest.fn().mockResolvedValue({
      cancel: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
      ],
      providers: [
        {
          provide: RabbitMqBrokerService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RabbitMqConsumerService,
          useValue: { runTopicConsumer },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await transport.onModuleInit();

    const consumerArgs = runTopicConsumer.mock.calls[0][0];
    const msg = {} as amqp.ConsumeMessage;
    const ch = {} as amqp.Channel;

    await consumerArgs.handleMessage(msg, ch);

    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle).toHaveBeenCalledWith(msg, ch);

    await transport.onModuleDestroy();
  });

  it('should cancel consumer on module destroy when subscribed', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    const runTopicConsumer = jest.fn().mockResolvedValue({ cancel });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({})],
        }),
      ],
      providers: [
        {
          provide: RabbitMqBrokerService,
          useValue: {
            isAvailable: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RabbitMqConsumerService,
          useValue: { runTopicConsumer },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await transport.onModuleInit();
    await transport.onModuleDestroy();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('should complete destroy when consumer was never started', async () => {
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
          useValue: { runTopicConsumer: jest.fn() },
        },
        {
          provide: RabbitsBornHandler,
          useValue: { handle: jest.fn() },
        },
        RabbitRabbitsTransport,
      ],
    }).compile();

    const broker = module.get<RabbitMqBrokerService>(RabbitMqBrokerService);
    const transport = module.get<RabbitRabbitsTransport>(RabbitRabbitsTransport);

    await broker.onModuleInit();
    await transport.onModuleInit();

    await expect(transport.onModuleDestroy()).resolves.toBeUndefined();

    await broker.onModuleDestroy();
  });
});
