// src/kafka/kafkaClient.js
import { Kafka } from 'kafkajs';
import { config } from '../config.js';
const kafkaInstance = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
});
export const getKafkaConnection = () => kafkaInstance;
export const getKafkaAdminConnection = () => {
    return kafkaInstance.admin();
};
