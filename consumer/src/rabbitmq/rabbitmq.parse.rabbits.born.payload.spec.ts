import { RabbitColor } from '../rabbit/types/rabbit.color.enum';
import { RabbitAllocation } from '../rabbit/types/rabbit.allocation.enum';
import { parseRabbitsBornPayload } from './rabbitmq.parse.rabbits.born.payload';

describe('parseRabbitsBornPayload', () => {
  const minimal = {
    id: '11111111-1111-5111-8111-111111111111',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    age: 1,
    name: 'Fluffy',
    color: RabbitColor.WHITE,
    speed: 2,
    isHungry: false,
    allocation: RabbitAllocation.IN_CAGE,
  };

  it('should parse valid payload', () => {
    const parsed = parseRabbitsBornPayload(minimal);

    expect(parsed?.createArgs.id).toBe(minimal.id);
    expect(parsed?.createArgs.name).toBe('Fluffy');
  });

  it('should reject invalid uuid id', () => {
    expect(
      parseRabbitsBornPayload({
        ...minimal,
        id: 'not-a-uuid',
      }),
    ).toBeNull();
  });

  it('should reject unknown color', () => {
    expect(
      parseRabbitsBornPayload({
        ...minimal,
        color: 'BLUE',
      }),
    ).toBeNull();
  });
});
