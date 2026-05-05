import type { Options } from 'amqplib';

export interface RabbitMqAssertExchangeArgs {
  exchange: string;
  type: 'topic';
  options?: Options.AssertExchange;
}
