import { RabbitDto } from './rabbit.dto';

export type CreateRabbitOutcome = 'created' | 'duplicate_id' | 'name_conflict';

export interface CreateRabbitResult {
  outcome: CreateRabbitOutcome;
  rabbit: RabbitDto | null;
}
