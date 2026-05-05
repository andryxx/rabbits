import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { encodeTelegramRabbitCallbackData } from '../telegram.callback.codec';
import { TelegramSubscriberStorage } from '../storage/telegram.subscriber.storage';
import { TelegramCallbackPublisherTransport } from '../../transport/telegram.callback.publisher.transport';
import { TelegramService } from './telegram.service';

const sendMessageMock = jest.fn();
const launchMock = jest.fn();
const stopMock = jest.fn();
const commandHandlers = new Map<string, (ctx: any) => Promise<void>>();
const eventHandlers = new Map<string, (ctx: any) => Promise<void>>();

jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    telegram: {
      sendMessage: sendMessageMock,
    },
    command: jest.fn((name: string, handler: (ctx: any) => Promise<void>) => {
      commandHandlers.set(name, handler);
    }),
    on: jest.fn((event: string, handler: (ctx: any) => Promise<void>) => {
      eventHandlers.set(event, handler);
    }),
    launch: launchMock,
    stop: stopMock,
  })),
  Markup: {
    inlineKeyboard: jest.fn((rows: unknown) => ({ reply_markup: { rows } })),
    button: {
      callback: jest.fn((text: string, data: string) => ({ text, data })),
    },
  },
}));

describe('TelegramService', () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
    launchMock.mockReset();
    stopMock.mockReset();
    commandHandlers.clear();
    eventHandlers.clear();
  });

  it('should be defined without token', async () => {
    const mockSubscriberStorage = {
      addSubscriber: jest.fn(),
      removeSubscriber: jest.fn(),
      getSubscriberChatIds: jest.fn().mockResolvedValue([]),
    };
    const mockCallbackPublisher = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_telegramBotToken: '' })],
        }),
      ],
      providers: [
        TelegramService,
        { provide: TelegramSubscriberStorage, useValue: mockSubscriberStorage },
        {
          provide: TelegramCallbackPublisherTransport,
          useValue: mockCallbackPublisher,
        },
      ],
    }).compile();

    expect(module.get(TelegramService)).toBeDefined();
  });

  it('should send text with reply params', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_telegramBotToken: 'token' })],
        }),
      ],
      providers: [
        TelegramService,
        {
          provide: TelegramSubscriberStorage,
          useValue: {
            addSubscriber: jest.fn(),
            removeSubscriber: jest.fn(),
            getSubscriberChatIds: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: TelegramCallbackPublisherTransport,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();
    const service = module.get(TelegramService);

    await service.sendText({
      chatId: '10',
      text: 'hello',
      replyToMessageId: 7,
    });

    expect(sendMessageMock).toHaveBeenCalledWith('10', 'hello', {
      reply_parameters: { message_id: 7 },
    });
  });

  it('should broadcast and send born notification', async () => {
    const storage = {
      addSubscriber: jest.fn(),
      removeSubscriber: jest.fn(),
      getSubscriberChatIds: jest.fn().mockResolvedValue(['10', '11']),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_telegramBotToken: 'token' })],
        }),
      ],
      providers: [
        TelegramService,
        { provide: TelegramSubscriberStorage, useValue: storage },
        {
          provide: TelegramCallbackPublisherTransport,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();
    const service = module.get(TelegramService);

    await service.broadcastText('text');
    await service.broadcastBornNotification({
      rabbitId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      text: 'born',
    });

    expect(sendMessageMock).toHaveBeenCalled();
    expect(sendMessageMock.mock.calls[0]).toEqual(['10', 'text']);
    expect(sendMessageMock.mock.calls[1]).toEqual(['11', 'text']);
    expect(sendMessageMock.mock.calls[2][0]).toBe('10');
    expect(sendMessageMock.mock.calls[2][1]).toBe('born');
    expect(sendMessageMock.mock.calls[3][0]).toBe('11');
    expect(sendMessageMock.mock.calls[3][1]).toBe('born');
  });

  it('should publish callback query with reply message id', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);

    await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ rabbit_telegramBotToken: 'token' })],
        }),
      ],
      providers: [
        TelegramService,
        {
          provide: TelegramSubscriberStorage,
          useValue: {
            addSubscriber: jest.fn(),
            removeSubscriber: jest.fn(),
            getSubscriberChatIds: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: TelegramCallbackPublisherTransport,
          useValue: { publish },
        },
      ],
    }).compile();

    const handler = eventHandlers.get('callback_query');
    expect(handler).toBeDefined();

    await handler!({
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      chat: { id: 10 },
      callbackQuery: {
        data: encodeTelegramRabbitCallbackData(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'c',
        ),
        message: { message_id: 42 },
      },
    });

    expect(publish).toHaveBeenCalledWith({
      payload: {
        rabbitId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        action: 'IN_CAGE',
        chatId: '10',
        replyToMessageId: 42,
      },
    });
  });
});
