import { RabbitColor } from './rabbit.color.enum';
import { RabbitAllocation } from './rabbit.allocation.enum';

export interface UpdateRabbitArgs {
  rabbitId: string;
  age?: number;
  name?: string;
  color?: RabbitColor;
  speed?: number;
  isHungry?: boolean;
  description?: string;
  allocation?: RabbitAllocation;
}
