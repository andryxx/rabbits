import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BornRabbitDto } from '../types/born.rabbit.dto';
import { BornRabbitResponseDto } from '../types/born.rabbit.response.dto';
import { RabbitService } from '../services/rabbit.service';

@ApiTags('Rabbit')
@Controller('rabbits')
export class RabbitController {
  private readonly logger = new Logger(RabbitController.name);

  constructor(private readonly rabbitService: RabbitService) {}

  @ApiOperation({ description: 'Publish a new rabbit to RabbitMQ' })
  @ApiCreatedResponse({
    description: 'Rabbit accepted for delivery',
    type: BornRabbitResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @HttpCode(HttpStatus.CREATED)
  @Post('born')
  async bornRabbit(
    @Body() body: BornRabbitDto,
  ): Promise<BornRabbitResponseDto> {
    this.logger.debug(body, 'Born rabbit request received');

    return await this.rabbitService.bornRabbit(body);
  }
}
