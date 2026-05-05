import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDate,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { RabbitColor } from './rabbit.color.enum';
import { RabbitAllocation } from './rabbit.allocation.enum';

export class RabbitDto {
  @ApiProperty({
    description: 'Rabbit ID',
    type: String,
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Creation date',
    type: Date,
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Last updated at',
    type: Date,
  })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    description: 'Age in months',
    type: Number,
    example: 8,
  })
  @IsInt()
  @Min(0)
  age: number;

  @ApiProperty({
    description: 'Name',
    type: String,
    example: 'Fluffy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Color',
    enum: RabbitColor,
    enumName: 'RabbitColor',
    example: RabbitColor.GREY,
  })
  @IsEnum(RabbitColor)
  color: RabbitColor;

  @ApiProperty({
    description: 'Housing allocation',
    enum: RabbitAllocation,
    enumName: 'RabbitAllocation',
    default: RabbitAllocation.JUST_BORN,
    example: RabbitAllocation.JUST_BORN,
  })
  @IsEnum(RabbitAllocation)
  allocation: RabbitAllocation;

  @ApiProperty({
    description: 'Speed',
    type: Number,
    example: 12.5,
  })
  @IsNumber()
  @Min(0)
  speed: number;

  @ApiProperty({
    description: 'Whether the rabbit is hungry',
    type: Boolean,
    example: true,
  })
  @IsBoolean()
  isHungry: boolean;

  @ApiPropertyOptional({
    description: 'Description',
    type: String,
    example: 'Likes carrots',
  })
  @IsOptional()
  @IsString()
  description?: string;

  constructor(partial: Partial<RabbitDto>) {
    Object.assign(this, partial);
  }
}
