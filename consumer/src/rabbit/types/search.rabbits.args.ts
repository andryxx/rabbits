import { RabbitColor } from './rabbit.color.enum';

export interface SearchRabbitsArgs {
  limit?: number;
  offset?: number;
  name?: string;
  color?: RabbitColor;
  age?: number;
  speed?: number;
  isHungry?: boolean;
}
