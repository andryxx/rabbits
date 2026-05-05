import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthDto } from './types/health.dto';
import { version } from '../../package.json';

@Controller({ path: 'healthcheck', version: VERSION_NEUTRAL })
export class HealthController {
  @ApiTags('System')
  @ApiOperation({
    description:
      'This endpoint is used by the deployment infrastructure. Does nothing, returns 200.',
  })
  @ApiOkResponse({
    description: 'Service is capable of processing requests.',
    type: HealthDto,
  })
  @Get()
  check() {
    return { version: version };
  }
}
