import { RabbitColor } from './rabbit.color.enum';
import { RabbitAllocation } from './rabbit.allocation.enum';

export interface CreateRabbitArgs {
  age: number;
  name: string;
  color: RabbitColor;
  speed: number;
  isHungry: boolean;
  description?: string;
  allocation?: RabbitAllocation;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}
