import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RabbitColor } from './rabbit.color.enum';

export class SearchRabbitsDto {
  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filter by name (case-insensitive contains)',
    type: String,
    example: 'flu',
  })
  @IsOptional()
  @IsString()
  filterByName?: string;

  @ApiPropertyOptional({
    description: 'Filter by color',
    enum: RabbitColor,
    enumName: 'RabbitColor',
    example: RabbitColor.GREY,
  })
  @IsOptional()
  @IsEnum(RabbitColor)
  filterByColor?: RabbitColor;

  @ApiPropertyOptional({
    description: 'Filter by age in months',
    type: Number,
    example: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  filterByAge?: number;

  @ApiPropertyOptional({
    description: 'Filter by speed',
    type: Number,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  filterBySpeed?: number;

  @ApiPropertyOptional({
    description: 'Filter by hungry flag',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  filterByIsHungry?: boolean;

  constructor(partial: Partial<SearchRabbitsDto>) {
    Object.assign(this, partial);
  }
}
