import { createMock } from '@golevelup/ts-jest';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { UuidGuard } from './uuid.guard';

describe('UuidGuard', () => {
  let uuidGuard: UuidGuard;

  beforeEach(async () => {
    uuidGuard = new UuidGuard();
  });

  it('should be defined', () => {
    expect(uuidGuard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if all ID parameters are UUIDs', async () => {
      const mockExecutionContext = createMock<ExecutionContext>();
      const userId = uuidv7();
      const laboratoryId = uuidv7();

      mockExecutionContext.switchToHttp().getRequest.mockReturnValueOnce({
        params: { userId, laboratoryId },
      });

      const result = uuidGuard.canActivate(mockExecutionContext);

      expect(result).toBeTruthy();
    });

    it('should throw bad request in case an ID parameter is not a UUID', async () => {
      const mockExecutionContext = createMock<ExecutionContext>();
      const userId = 'some';
      const laboratoryId = uuidv7();

      mockExecutionContext.switchToHttp().getRequest.mockReturnValueOnce({
        params: { userId, laboratoryId },
      });

      const canActivate = () => {
        uuidGuard.canActivate(mockExecutionContext);
      };

      expect(canActivate).toThrow(BadRequestException);
    });

    it('should return true if non ID parameter does not contain UUID', async () => {
      const mockExecutionContext = createMock<ExecutionContext>();
      const user = 'some';
      const laboratoryId = uuidv7();

      mockExecutionContext.switchToHttp().getRequest.mockReturnValueOnce({
        params: { user, laboratoryId },
      });

      const result = uuidGuard.canActivate(mockExecutionContext);

      expect(result).toBeTruthy();
    });

    it('should return true if there are no parameters', async () => {
      const mockExecutionContext = createMock<ExecutionContext>();

      mockExecutionContext.switchToHttp().getRequest.mockReturnValueOnce({});

      const result = uuidGuard.canActivate(mockExecutionContext);

      expect(result).toBeTruthy();
    });
  });
});
