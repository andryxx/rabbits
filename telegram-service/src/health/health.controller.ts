import { Controller, Get } from '@nestjs/common';
import { version } from '../../package.json';

@Controller('healthcheck')
export class HealthController {
  @Get()
  check() {
    return { version };
  }
}
