import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();

        response.setHeader(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains',
        );
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; frame-ancestors 'none';",
        );
        response.setHeader(
          'Permissions-Policy',
          'geolocation=(), microphone=(), camera=(self)',
        );
        response.setHeader('X-XSS-Protection', '1; mode=block');

        return data;
      }),
    );
  }
}
