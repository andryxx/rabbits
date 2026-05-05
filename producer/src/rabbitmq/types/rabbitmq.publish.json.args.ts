export interface RabbitMqPublishJsonArgs {
  exchange: string;
  routingKey: string;
  payload: Record<string, unknown>;
}
