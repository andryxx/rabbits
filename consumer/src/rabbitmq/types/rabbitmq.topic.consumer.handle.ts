export interface RabbitMqTopicConsumerHandle {
  cancel(): Promise<void>;
}
