import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RabbitDto } from '../types/rabbit.dto';
import { SearchRabbitsDto } from '../types/search.rabbits.dto';
import { RabbitService } from '../services/rabbit.service';

@ApiTags('Rabbit')
@Controller('rabbits')
export class RabbitController {
  private readonly logger = new Logger(RabbitController.name);

  constructor(private readonly rabbitService: RabbitService) {}

  @ApiOperation({ description: 'Search rabbits' })
  @ApiOkResponse({
    description: 'Rabbits returned',
    type: [RabbitDto],
  })
  @Get('search')
  async searchRabbits(@Query() query: SearchRabbitsDto): Promise<RabbitDto[]> {
    const {
      limit,
      offset,
      filterByName,
      filterByColor,
      filterByAge,
      filterBySpeed,
      filterByIsHungry,
    } = query;

    return await this.rabbitService.searchRabbits({
      limit,
      offset,
      name: filterByName,
      color: filterByColor,
      age: filterByAge,
      speed: filterBySpeed,
      isHungry: filterByIsHungry,
    });
  }

  @ApiOperation({ description: 'Delete all rabbits' })
  @ApiNoContentResponse({ description: 'All rabbits removed' })
  @Delete('shoot-them-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async shootThemAll(): Promise<void> {
    this.logger.debug('Shoot them all request received');

    await this.rabbitService.deleteAllRabbits();
  }

  @ApiOperation({ description: 'Get rabbit by ID' })
  @ApiOkResponse({ description: 'Rabbit found', type: RabbitDto })
  @ApiNotFoundResponse({ description: 'Rabbit not found' })
  @Get(':rabbitId')
  async getRabbitById(
    @Param('rabbitId', ParseUUIDPipe) rabbitId: string,
  ): Promise<RabbitDto> {
    return await this.rabbitService.getRabbitByIdOrThrow(rabbitId);
  }
}
