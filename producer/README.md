# Promo Codes Service

REST API сервис для управления промокодами и их активацией по email.

## Возможности

- **CRUD промокодов**: создание, просмотр по ID, поиск с фильтрами, обновление
- **Активация промокодов**: привязка промокода к email с проверками лимита и срока действия
- **Ограничения активации**:
  - Один email может активировать конкретный промокод только один раз
  - Нельзя активировать промокод сверх лимита `maxActivations`
  - Нельзя активировать просроченный промокод

## Стек

- **Runtime**: Node.js 24
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL 17
- **ORM**: Prisma 7
- **API Docs**: Swagger / OpenAPI

## ЗАПУСК ЧЕРЕЗ Docker Compose

```bash
docker-compose up --build
```

После запуска:
- API доступен по адресу: http://localhost:3000
- Swagger UI: http://localhost:3000/v1/bi/api
- База данных: `localhost:5432`

## ЛОКАЛЬНЫЙ ЗАПУСК

### Требования

- Node.js 24+
- PostgreSQL 17+

### Установка

```bash
npm install
```

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
rabbit_databaseUrl=postgresql://postgres:postgres@localhost:5432/promocodes_db
rabbit_port=3000
rabbit_domain=localhost
rabbit_logLevel=debug
rabbit_prettyLogs=true
```

### Миграции

```bash
npx prisma migrate dev
npx prisma generate
```

### Запуск в dev-режиме

```bash
npm run start:dev
```

### Запуск production-сборки

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Промокоды

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `POST` | `/v1/promo-codes` | Создать промокод |
| `GET` | `/v1/promo-codes/:promoCodeId` | Получить промокод по ID |
| `GET` | `/v1/promo-codes/search` | Поиск промокодов с фильтрами |
| `PATCH` | `/v1/promo-codes/:promoCodeId` | Обновить промокод |

### Активации

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `POST` | `/v1/activations` | Активировать промокод по коду и email |

## Swagger

Интерактивная документация API доступна по адресу:

**http://localhost:3000/v1/bi/api**

## Тестирование

```bash
# Unit-тесты
npm test

# Тесты в CI-режиме
npm run test:ci
```
