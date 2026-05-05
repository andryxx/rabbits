import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { version } from '../package.json';
import * as http from 'node:http';
import cookieParser from 'cookie-parser';
import { SecurityHeadersInterceptor } from './security/security.headers.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const origin = `https://app.${configService.getOrThrow<string>('rabbit_domain')}`;

  app.enableCors({
    origin,
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalInterceptors(new SecurityHeadersInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const port = +configService.get<number>('rabbit_port');

  app.useLogger(app.get(Logger));

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setVersion(version)
    .setTitle('Rabbit Consumer Service')
    .setDescription('Consumer service API: rabbits storage')
    .addTag('Rabbit')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/bi/api', app, document);

  const keepAliveTimeout = +configService.get<number>(
    'rabbit_keepAliveTimeout',
    62000,
  );

  const server: http.Server = app.getHttpServer();
  server.keepAliveTimeout = keepAliveTimeout;
  server.headersTimeout = keepAliveTimeout + 1;

  await app.listen(port);
}

void bootstrap();
