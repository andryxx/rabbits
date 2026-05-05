import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import { TelegramSubscriberStorage } from './telegram.subscriber.storage';
import { RedisService } from '../../redis/redis.service';

describe('TelegramSubscriberStorage', () => {
  let storage: TelegramSubscriberStorage;
  let mockRedis: InstanceType<typeof RedisMock>;

  beforeEach(async () => {
    mockRedis = new RedisMock();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              rabbit_redisTelegramSubscribersKey: 'telegram:test:subscribers',
            }),
          ],
        }),
      ],
      providers: [
        TelegramSubscriberStorage,
        {
          provide: RedisService,
          useValue: {
            getClient: () => mockRedis,
            onModuleDestroy: async () => mockRedis.quit(),
          },
        },
      ],
    }).compile();

    storage = module.get<TelegramSubscriberStorage>(TelegramSubscriberStorage);
  });

  afterEach(async () => {
    await mockRedis.flushall();
    await mockRedis.quit();
  });

  it('should add and list subscribers', async () => {
    await storage.addSubscriber('111');
    await storage.addSubscriber('222');

    const ids = await storage.getSubscriberChatIds();

    expect(ids).toEqual(['111', '222']);
  });

  it('should remove subscriber', async () => {
    await storage.addSubscriber('111');
    await storage.removeSubscriber('111');

    const ids = await storage.getSubscriberChatIds();

    expect(ids).toEqual([]);
  });
});
