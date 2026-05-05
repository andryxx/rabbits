# Rabbit Consumer

NestJS-сервис: приём сообщений о рождении кролика из RabbitMQ, хранение в **Redis**, публикация уведомлений в exchange **telegram**, REST API для работы с кроликами, отдельный consumer для callback-кнопок из Telegram.

## Стек

- Node.js 24, NestJS 11, TypeScript  
- RabbitMQ (amqplib), Redis (ioredis)  
- Swagger: `http://localhost:<rabbit_port>/v1/bi/api`

## Переменные окружения

См. корень репозитория `consumer/.env.example`. Минимально нужны:

- `rabbit_amqpUrl` — подключение к RabbitMQ  
- `rabbit_redisUrl` — подключение к Redis  
- `rabbit_domain` — домен для CORS (`https://app.${rabbit_domain}`)  
- `rabbit_port` — HTTP-порт (по умолчанию в тестах часто `3001`)

Опционально переопределяются exchange, очередь, routing keys для топика `rabbits`, для публикации в `telegram` и для очереди callback из Telegram (имена совпадают с кодом в `rabbitmq/*.service.ts` и `rabbit/transport/*.transport.ts`).

Обработка нажатий кнопок в Telegram (`handleTelegramRabbitCallback`): для одного `rabbitId` в Redis берётся блокировка `SET … NX` с TTL (см. `RabbitStorage.acquireTelegramCallbackLock`); параллельные сообщения по тому же кролику получают отказ без изменения данных. Пока кролик в `JUST_BORN` или `IN_CAGE`, доступны «В клетку», «Выпустить» и «Пристрелить» (повтор «В клетку» при уже `IN_CAGE` даёт подсказку без изменения данных). После перевода в `FREE_ROAMING` любые кнопки дают отказ без изменений в Redis.

## Запуск

Рекомендуется общий стек из **корня репозитория**:

```bash
docker compose up --build
```

Consumer будет доступен на порту **3001** (см. корневой `docker-compose.yml`).

Локально:

```bash
npm install
npm run start:dev
```

## Тесты

```bash
npm test
```

Дополнительно см. корневой `README.md`.
