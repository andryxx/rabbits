import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get<number>('rabbit_port') ?? 3020);

  await app.listen(port);

  logger.log(`Telegram service listening on http://localhost:${port}`);
}

void bootstrap();
