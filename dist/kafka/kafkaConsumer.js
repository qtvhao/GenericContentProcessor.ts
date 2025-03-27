import { getKafkaConnection } from './kafkaClient.js';
/**
 * Ensures the topic exists before subscribing.
 */
const ensureTopicExists = async (kafka, topic) => {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
        await admin.createTopics({
            topics: [{ topic }],
        });
        console.log(`📌 Topic created: ${topic}`);
    }
    await admin.disconnect();
};
/**
 * Starts a Kafka consumer with a given topic and message handler.
 */
export const startKafkaConsumer = async ({ topic, groupId, eachMessageHandler }) => {
    const kafka = getKafkaConnection();
    const consumer = kafka.consumer({ groupId });
    try {
        await ensureTopicExists(kafka, topic);
        await consumer.connect();
        console.log(`✅ Kafka Consumer connected (Group: ${groupId})`);
        await consumer.subscribe({ topic, fromBeginning: false });
        console.log(`🎧 Listening for messages on topic: ${topic}`);
        await consumer.run({ eachMessage: eachMessageHandler });
    }
    catch (error) {
        console.error(`❌ Error starting Kafka consumer for topic ${topic}:`, error);
    }
    // Handle graceful shutdown
    process.on('SIGTERM', async () => await shutdownKafkaConsumer(consumer));
    process.on('SIGINT', async () => await shutdownKafkaConsumer(consumer));
    return consumer;
};
/**
 * Gracefully shuts down a Kafka consumer.
 */
const shutdownKafkaConsumer = async (consumer) => {
    console.log('🔻 Shutting down Kafka Consumer...');
    try {
        await consumer.disconnect();
        console.log('✅ Kafka Consumer disconnected.');
    }
    catch (error) {
        console.error('❌ Error disconnecting Kafka Consumer:', error);
    }
};
