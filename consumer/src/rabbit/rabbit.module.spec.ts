import { RabbitModule } from './rabbit.module';

describe('RabbitModule', () => {
  it('should instantiate module successfully', () => {
    expect(new RabbitModule()).toBeDefined();
  });
});
