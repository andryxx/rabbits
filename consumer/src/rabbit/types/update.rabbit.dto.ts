import { PartialType, PickType } from '@nestjs/swagger';
import { RabbitDto } from './rabbit.dto';

export class UpdateRabbitDto extends PartialType(
  PickType(RabbitDto, [
    'age',
    'name',
    'color',
    'allocation',
    'speed',
    'isHungry',
    'description',
  ] as const),
) {
  constructor(partial: Partial<UpdateRabbitDto>) {
    super(partial);
    Object.assign(this, partial);
  }
}
