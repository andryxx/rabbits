import { HealthModule } from './health.module';

describe('HealthModule', () => {
  it('should instantiate module successfully', () => {
    expect(new HealthModule()).toBeDefined();
  });
});
