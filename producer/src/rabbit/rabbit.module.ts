import { Module } from '@nestjs/common';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';
import { RabbitController } from './controllers/rabbit.controller';
import { RabbitService } from './services/rabbit.service';
import { RabbitPublisherTransport } from './transport/rabbit.publisher.transport';

@Module({
  imports: [RabbitMqModule],
  controllers: [RabbitController],
  providers: [RabbitService, RabbitPublisherTransport],
})
export class RabbitModule {}
