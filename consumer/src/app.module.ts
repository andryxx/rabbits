import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import loggerSettings from './logger/logger.settings';
import { RabbitModule } from './rabbit/rabbit.module';
import { TraceMiddleware } from './middleware/trace.middleware';
import { APP_GUARD } from '@nestjs/core';
import { UuidGuard } from './guards/uuid.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: UuidGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync(loggerSettings),
    RabbitModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).exclude('/healthcheck').forRoutes('*');
  }
}
