import { EachMessagePayload } from 'kafkajs';
interface KafkaConsumerOptions {
    topic: string;
    groupId: string;
    eachMessageHandler: (payload: EachMessagePayload) => Promise<void>;
}
/**
 * Starts a Kafka consumer with a given topic and message handler.
 */
export declare const startKafkaConsumer: ({ topic, groupId, eachMessageHandler }: KafkaConsumerOptions) => Promise<void>;
export {};
