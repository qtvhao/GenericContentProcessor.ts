import { CorrelationTracker } from "./utils/CorrelationTracker.js";
import { startKafkaConsumer } from "./kafka/kafkaConsumer.js";
export class KafkaVideoCompletionHandler {
    correlationTracker = new CorrelationTracker();
    isConsumerStarted = false;
    constructor() {
        this.startConsumer();
    }
    async startConsumer() {
        if (this.isConsumerStarted)
            return;
        this.isConsumerStarted = true;
        try {
            await startKafkaConsumer({
                topic: process.env.VIDEO_COMPLETION_GATHER_TOPIC || 'video-completion-topic',
                groupId: 'video-manager-group',
                eachMessageHandler: async ({ message }) => {
                    const parsedMessage = JSON.parse(message.value?.toString() || '{}');
                    if (parsedMessage.status === 'completed') {
                        console.debug(`📨 Kafka message received: ${message.value?.toString()}`);
                        this.correlationTracker.markCompleted(parsedMessage.correlationId);
                    }
                }
            });
        }
        catch (err) {
            console.error('❌ Kafka consumer error:', err);
            throw err;
        }
    }
    async waitForVideoCompletions(correlationIds, outputFilePaths) {
        if (correlationIds.length !== outputFilePaths.length) {
            throw new Error('Mismatch between correlation IDs and output file paths count.');
        }
        const correlationMap = this.buildCorrelationMap(correlationIds, outputFilePaths);
        console.debug('📥 Preparing to wait for video completions...');
        // Log correlationId to filePath mappings
        for (const [id, { filePath }] of correlationMap.entries()) {
            console.debug(`🔗 Tracking correlationId: ${id} -> ${filePath}`);
        }
        return new Promise((resolve) => {
            this.correlationTracker.waitForAll(correlationIds).then(() => {
                console.log('🏋️ All video completions received via Kafka!');
                resolve();
            });
        });
    }
    buildCorrelationMap(correlationIds, outputFilePaths) {
        const map = new Map();
        correlationIds.forEach((id, index) => {
            map.set(id, {
                index,
                filePath: outputFilePaths[index]
            });
        });
        return map;
    }
}
