import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    let traceId = req.headers['x-trace-id'];

    if (!traceId) {
      traceId = uuidv7();
      req.headers['x-trace-id'] = traceId;
    }

    res.set('x-trace-id', traceId);

    next();
  }
}
