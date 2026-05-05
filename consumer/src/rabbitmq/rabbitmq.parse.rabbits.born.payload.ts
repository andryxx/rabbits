import { isUUID } from 'class-validator';
import { CreateRabbitArgs } from '../rabbit/types/create.rabbit.args';
import { RabbitAllocation } from '../rabbit/types/rabbit.allocation.enum';
import { RabbitColor } from '../rabbit/types/rabbit.color.enum';

export interface ParsedRabbitsBornPayload {
  createArgs: CreateRabbitArgs;
}

export function parseRabbitsBornPayload(
  parsed: unknown,
): ParsedRabbitsBornPayload | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const o = parsed as Record<string, unknown>;

  if (!isUUID(o.id as string)) {
    return null;
  }

  if (
    typeof o.createdAt !== 'string' ||
    typeof o.updatedAt !== 'string' ||
    typeof o.age !== 'number' ||
    typeof o.name !== 'string' ||
    typeof o.speed !== 'number' ||
    typeof o.isHungry !== 'boolean'
  ) {
    return null;
  }

  if (!Object.values(RabbitColor).includes(o.color as RabbitColor)) {
    return null;
  }

  const allocationRaw = o.allocation;

  if (allocationRaw !== undefined) {
    if (
      !Object.values(RabbitAllocation).includes(
        allocationRaw as RabbitAllocation,
      )
    ) {
      return null;
    }
  }

  if (o.description !== undefined && typeof o.description !== 'string') {
    return null;
  }

  const createArgs: CreateRabbitArgs = {
    id: o.id as string,
    createdAt: o.createdAt as string,
    updatedAt: o.updatedAt as string,
    age: o.age,
    name: o.name,
    color: o.color as RabbitColor,
    speed: o.speed,
    isHungry: o.isHungry,
    allocation:
      allocationRaw === undefined
        ? undefined
        : (allocationRaw as RabbitAllocation),
    description:
      o.description === undefined ? undefined : (o.description as string),
  };

  return {
    createArgs,
  };
}
