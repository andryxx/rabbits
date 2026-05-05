import { ApiProperty } from '@nestjs/swagger';

export class BornRabbitResponseDto {
  @ApiProperty({
    description:
      'UUID v5 derived from a SHA-256 digest of canonical rabbit fields',
    type: String,
  })
  id: string;

  constructor(partial: Partial<BornRabbitResponseDto>) {
    Object.assign(this, partial);
  }
}
