import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMqConsumeMessageParseService } from '../../rabbitmq/rabbitmq.consume.message.parse.service';
import { RabbitMqConsumeRetrySettings } from '../../rabbitmq/rabbitmq.consume.retry.settings';
import { RabbitStorage } from '../storage/rabbit.storage';
import { RabbitAllocation } from '../types/rabbit.allocation.enum';
import { TelegramCallbackAction } from '../types/telegram.callback.action.enum';
import { RabbitTelegramTransport } from './rabbit.telegram.transport';
import { TelegramCallbackHandler } from './telegram.callback.handler';

describe('TelegramCallbackHandler', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramCallbackHandler,
        {
          provide: RabbitMqConsumeRetrySettings,
          useValue: { consumeMaxAttempts: 3 },
        },
        {
          provide: RabbitMqConsumeMessageParseService,
          useValue: { parseConsumeMessageBody: jest.fn() },
        },
        {
          provide: RabbitStorage,
          useValue: {},
        },
        {
          provide: RabbitTelegramTransport,
          useValue: {},
        },
      ],
    }).compile();

    expect(module.get(TelegramCallbackHandler)).toBeDefined();
  });

  describe('handleTelegramRabbitCallback', () => {
    const rabbitId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const stats = {
      bornTotal: 1,
      inCage: 0,
      freeRoaming: 0,
      killedTotal: 0,
    };

    let handler: TelegramCallbackHandler;
    let storageMock: {
      acquireTelegramCallbackLock: jest.Mock;
      releaseTelegramCallbackLock: jest.Mock;
      getRabbitById: jest.Mock;
      updateRabbit: jest.Mock;
      deleteRabbit: jest.Mock;
      incrKilledTotal: jest.Mock;
      getRabbitPopulationStats: jest.Mock;
    };
    let telegramMock: { publishDirectAck: jest.Mock };

    beforeEach(async () => {
      storageMock = {
        acquireTelegramCallbackLock: jest.fn(),
        releaseTelegramCallbackLock: jest.fn(),
        getRabbitById: jest.fn(),
        updateRabbit: jest.fn(),
        deleteRabbit: jest.fn(),
        incrKilledTotal: jest.fn(),
        getRabbitPopulationStats: jest.fn(),
      };

      telegramMock = {
        publishDirectAck: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramCallbackHandler,
          {
            provide: RabbitMqConsumeRetrySettings,
            useValue: { consumeMaxAttempts: 3 },
          },
          {
            provide: RabbitMqConsumeMessageParseService,
            useValue: { parseConsumeMessageBody: jest.fn() },
          },
          {
            provide: RabbitStorage,
            useValue: storageMock as unknown as RabbitStorage,
          },
          {
            provide: RabbitTelegramTransport,
            useValue: telegramMock,
          },
        ],
      }).compile();

      handler = module.get<TelegramCallbackHandler>(TelegramCallbackHandler);
      storageMock.getRabbitPopulationStats.mockResolvedValue(stats);
    });

    const callHandler = async (
      action: TelegramCallbackAction,
    ): Promise<void> => {
      await (
        handler as unknown as {
          handleTelegramRabbitCallback(config: {
            rabbitId: string;
            action: TelegramCallbackAction;
            chatId: string;
          }): Promise<void>;
        }
      ).handleTelegramRabbitCallback({
        rabbitId,
        action,
        chatId: '10',
      });
    };

    it('should notify busy when lock is not acquired', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(false);

      await callHandler(TelegramCallbackAction.IN_CAGE);

      expect(storageMock.releaseTelegramCallbackLock).not.toHaveBeenCalled();
      expect(telegramMock.publishDirectAck).toHaveBeenCalledTimes(1);
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'уже обрабатывается',
      );
    });

    it('should ack already in cage when IN_CAGE pressed for caged rabbit', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'X',
        allocation: RabbitAllocation.IN_CAGE,
      });

      await callHandler(TelegramCallbackAction.IN_CAGE);

      expect(storageMock.updateRabbit).not.toHaveBeenCalled();
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'уже в клетке',
      );
    });

    it('should release rabbit when FREE_ROAMING pressed from cage', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'Y',
        allocation: RabbitAllocation.IN_CAGE,
      });
      storageMock.updateRabbit.mockResolvedValue({
        id: rabbitId,
        name: 'Y',
        allocation: RabbitAllocation.FREE_ROAMING,
      });

      await callHandler(TelegramCallbackAction.FREE_ROAMING);

      expect(storageMock.updateRabbit).toHaveBeenCalledWith({
        rabbitId,
        allocation: RabbitAllocation.FREE_ROAMING,
      });
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'выпущен',
      );
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
    });

    it('should reject any action when rabbit is already FREE_ROAMING', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'Z',
        allocation: RabbitAllocation.FREE_ROAMING,
      });

      await callHandler(TelegramCallbackAction.KILL);

      expect(storageMock.deleteRabbit).not.toHaveBeenCalled();
      expect(storageMock.incrKilledTotal).not.toHaveBeenCalled();
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'выпущен',
      );
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
    });

    it('should update allocation when rabbit is JUST_BORN', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'Fluffy',
        allocation: RabbitAllocation.JUST_BORN,
      });
      storageMock.updateRabbit.mockResolvedValue({
        id: rabbitId,
        name: 'Fluffy',
        allocation: RabbitAllocation.FREE_ROAMING,
      });

      await callHandler(TelegramCallbackAction.FREE_ROAMING);

      expect(storageMock.updateRabbit).toHaveBeenCalledWith({
        rabbitId,
        allocation: RabbitAllocation.FREE_ROAMING,
      });
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'выпущен',
      );
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
    });

    it('should kill when rabbit is JUST_BORN', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'N',
        allocation: RabbitAllocation.JUST_BORN,
      });
      storageMock.deleteRabbit.mockResolvedValue(true);

      await callHandler(TelegramCallbackAction.KILL);

      expect(storageMock.deleteRabbit).toHaveBeenCalledWith({ rabbitId });
      expect(storageMock.incrKilledTotal).toHaveBeenCalledTimes(1);
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'пристрелен',
      );
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
    });

    it('should kill when rabbit is IN_CAGE', async () => {
      storageMock.acquireTelegramCallbackLock.mockResolvedValue(true);
      storageMock.getRabbitById.mockResolvedValue({
        id: rabbitId,
        name: 'Z',
        allocation: RabbitAllocation.IN_CAGE,
      });
      storageMock.deleteRabbit.mockResolvedValue(true);

      await callHandler(TelegramCallbackAction.KILL);

      expect(storageMock.deleteRabbit).toHaveBeenCalledWith({ rabbitId });
      expect(storageMock.incrKilledTotal).toHaveBeenCalledTimes(1);
      expect(telegramMock.publishDirectAck.mock.calls[0][0].text).toContain(
        'пристрелен',
      );
      expect(storageMock.releaseTelegramCallbackLock).toHaveBeenCalledWith(
        rabbitId,
      );
    });
  });
});
