import { RabbitMqModule } from './rabbitmq.module';

describe('RabbitMqModule', () => {
  it('should be defined', () => {
    expect(new RabbitMqModule()).toBeDefined();
  });
});
