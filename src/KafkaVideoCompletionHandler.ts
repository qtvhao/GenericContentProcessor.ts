import { CorrelationTracker } from "./utils/CorrelationTracker.js";
import { startKafkaConsumer } from "./kafka/kafkaConsumer.js";

export class KafkaVideoCompletionHandler {
    private correlationTracker = new CorrelationTracker();
    private isConsumerStarted = false;

    constructor() {
        this.startConsumer();
    }

    private async startConsumer() {
        if (this.isConsumerStarted) return;

        this.isConsumerStarted = true;

        try {
            await startKafkaConsumer({
                topic: process.env.VIDEO_COMPLETION_GATHER_TOPIC || 'video-completion-topic',
                groupId: 'video-manager-group',
                eachMessageHandler: async ({ message }) => {
                    try {
                        const parsedMessage = JSON.parse(message.value?.toString() || '{}');
                        if (parsedMessage.status === 'completed') {
                            console.debug(`📨 Kafka message received: ${message.value?.toString()}`);
                            this.correlationTracker.markCompleted(parsedMessage.correlationId);
                        } else {
                            console.debug(`📭 Kafka message ignored (status not completed): ${message.value?.toString()}`);
                        }
                    } catch (err) {
                        console.error('⚠️ Error processing Kafka message. Delaying ack...', err);
                        // Wait for a short duration before acknowledging the message
                        await new Promise(res => setTimeout(res, 5000)); // 5 seconds delay
                    }
                }
            });
        } catch (err) {
            console.error('❌ Kafka consumer error:', err);
            throw err;
        }
    }

    async waitForVideoCompletions(
        correlationIds: string[],
        outputFilePaths: string[]
    ): Promise<void> {
        if (correlationIds.length !== outputFilePaths.length) {
            throw new Error('Mismatch between correlation IDs and output file paths count.');
        }

        const correlationMap = this.buildCorrelationMap(correlationIds, outputFilePaths);

        console.debug('📥 Preparing to wait for video completions...');

        // Log correlationId to filePath mappings
        for (const [id, { filePath }] of correlationMap.entries()) {
            console.debug(`🔗 Tracking correlationId: ${id} -> ${filePath}`);
        }

        return new Promise<void>((resolve) => {
            this.correlationTracker.waitForAll(correlationIds).then(() => {
                console.log('🏋️ All video completions received via Kafka!');
                resolve();
            });
        });
    }

    private buildCorrelationMap(
        correlationIds: string[],
        outputFilePaths: string[]
    ): Map<string, { index: number; filePath: string }> {
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
