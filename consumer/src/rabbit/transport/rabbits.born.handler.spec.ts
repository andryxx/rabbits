import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMqConsumeMessageParseService } from '../../rabbitmq/rabbitmq.consume.message.parse.service';
import { RabbitMqConsumeRetrySettings } from '../../rabbitmq/rabbitmq.consume.retry.settings';
import { RabbitService } from '../services/rabbit.service';
import { RabbitTelegramTransport } from './rabbit.telegram.transport';
import { RabbitsBornHandler } from './rabbits.born.handler';

describe('RabbitsBornHandler', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitsBornHandler,
        {
          provide: RabbitMqConsumeRetrySettings,
          useValue: { consumeMaxAttempts: 3 },
        },
        {
          provide: RabbitMqConsumeMessageParseService,
          useValue: { parseConsumeMessageBody: jest.fn() },
        },
        { provide: RabbitService, useValue: {} },
        { provide: RabbitTelegramTransport, useValue: {} },
      ],
    }).compile();

    expect(module.get(RabbitsBornHandler)).toBeDefined();
  });
});
