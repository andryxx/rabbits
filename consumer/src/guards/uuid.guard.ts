import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class UuidGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const params = request.params;

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (key.toLowerCase().endsWith('id')) {
          if (!isUUID(value)) {
            throw new BadRequestException(
              `Path param "${key}" must be a valid UUID`,
            );
          }
        }
      }
    }

    return true;
  }
}
