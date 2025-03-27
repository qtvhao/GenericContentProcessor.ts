import VideoCreationService, { VideoCreationOptions } from "./VideoCreationService.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { startKafkaConsumer } from "./kafka/kafkaConsumer.js";
import { Consumer } from "kafkajs";

export class GenericVideoManager {
    constructor() {}

    async processVideos(
        options: VideoCreationOptions[],
        finalOutputPath: string,
        useKafka: boolean = false
    ): Promise<void> {
        try {
            console.debug('🚚 Requesting video creation...');
            const correlationIds = await this.requestVideoCreations(options);

            console.debug('⏳ Waiting for video completion...');
            const outputFilePaths = options.map(opt => opt.outputFilePath);

            if (useKafka) {
                await this.waitForVideoCompletions(correlationIds, outputFilePaths);
            } else {
                await this.pollForVideoCompletions(correlationIds, outputFilePaths);
            }

            console.log('🎉 All videos processed and downloaded!');

            console.debug('🎬 Starting video concatenation...');
            await this.concatVideosWithFFmpeg(outputFilePaths, finalOutputPath);

            console.log(`✅ Final video concatenated at ${finalOutputPath}`);
        } catch (error) {
            console.error('❌ Error processing videos:', error);
        }
    }

    private async requestVideoCreations(options: VideoCreationOptions[]): Promise<string[]> {
        console.debug('📨 Sending video creation request...');
        const ids = await VideoCreationService.bulkRequestVideoCreation(options);
        console.debug('✅ Correlation IDs received:', ids);
        return ids;
    }

    private async pollForVideoCompletions(correlationIds: string[], outputFilePaths: string[]): Promise<void> {
        console.debug('📡 Polling for video completions...');
        await VideoCreationService.bulkPollForVideos(
            correlationIds,
            outputFilePaths,
            {
                maxAttempts: 60 * 20,
                delay: 1000,
                onSuccess: (index, filePath) => {
                    console.log(`✅ [Clip ${index + 1}] Video completed at ${filePath}`);
                },
                onError: (index, error) => {
                    console.error(`❌ [Clip ${index + 1}] Failed after retries. Error: ${error.message}`);
                }
            }
        );
        console.debug('🏁 Finished polling.');
    }

    private async concatVideosWithFFmpeg(inputFilePaths: string[], outputFilePath: string): Promise<void> {
        // Create a temporary file list for ffmpeg
        const listFilePath = path.join(path.dirname(outputFilePath), 'concat_list.txt');
        const fileListContent = inputFilePaths.map(filePath => `file '${filePath}'`).join('\n');
        fs.writeFileSync(listFilePath, fileListContent);

        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-f', 'concat',
                '-safe', '0',
                '-i', listFilePath,
                '-c', 'copy',
                outputFilePath
            ];

            console.debug(`🚀 Running ffmpeg with args: ${ffmpegArgs.join(' ')}`);

            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            ffmpeg.stdout.on('data', data => {
                console.log(`ffmpeg stdout: ${data}`);
            });

            ffmpeg.stderr.on('data', data => {
                console.error(`ffmpeg stderr: ${data}`);
            });

            ffmpeg.on('close', code => {
                if (code === 0) {
                    console.log('🎥 ffmpeg process completed successfully.');
                    fs.unlinkSync(listFilePath); // Clean up
                    resolve();
                } else {
                    reject(new Error(`ffmpeg process exited with code ${code}`));
                }
            });
        });
    }

    private async waitForVideoCompletions(
        correlationIds: string[],
        outputFilePaths: string[]
    ): Promise<void> {
        const completed = new Set<string>();
        const correlationMap = this.buildCorrelationMap(correlationIds, outputFilePaths);

        console.debug('📥 Starting Kafka consumer for video completions...');

        return new Promise<void>(async (resolve, reject) => {
            try {
                const consumer: Consumer = await startKafkaConsumer({
                    topic: 'video-completion-topic',
                    groupId: 'video-manager-group',
                    eachMessageHandler: async ({ message }) => {
                        console.debug(`📨 Kafka message received: ${message.value?.toString()}`);
                        this.handleKafkaMessage(message, correlationMap, completed);

                        if (completed.size === correlationIds.length) {
                            console.log('🏁 All video completions received via Kafka!');
                            await consumer.stop();
                            console.log('🛑 Kafka consumer stopped.');
                            resolve();
                        } else {
                            console.debug(`📊 Completion progress: ${completed.size}/${correlationIds.length}`);
                        }
                    }
                });
            } catch (err) {
                console.error('❌ Kafka consumer error:', err);
                reject(err);
            }
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

    private handleKafkaMessage(
        message: any,
        correlationMap: Map<string, { index: number; filePath: string }>,
        completed: Set<string>
    ): void {
        try {
            const value = message.value?.toString();
            if (!value) {
                console.debug('⚠️ Kafka message value is empty or undefined.');
                return;
            }

            const parsed = JSON.parse(value);
            const correlationId = parsed.correlationId;
            const status = parsed.status;

            console.debug(`📦 Parsed Kafka message - CorrelationId: ${correlationId}, Status: ${status}`);

            if (status === 'completed') {
                if (correlationMap.has(correlationId)) {
                    if (!completed.has(correlationId)) {
                        completed.add(correlationId);

                        const { index, filePath } = correlationMap.get(correlationId)!;
                        console.log(`✅ [Clip ${index + 1}] Video completed at ${filePath}`);
                    } else {
                        console.debug(`⚠️ Duplicate completion message received for correlationId: ${correlationId}`);
                    }
                } else {
                    console.warn(`❓ Unknown correlationId received: ${correlationId}`);
                }
            } else {
                console.debug(`ℹ️ Ignored message with non-completed status: ${status}`);
            }
        } catch (err) {
            console.error('❌ Error handling Kafka message:', err);
        }
    }
}
