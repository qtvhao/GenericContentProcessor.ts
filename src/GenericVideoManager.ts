import VideoCreationService, { VideoCreationOptions } from "./VideoCreationService.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { startKafkaConsumer } from "./kafka/kafkaConsumer.js";
import { CorrelationTracker } from "./utils/CorrelationTracker.js";

export class GenericVideoManager {
    private kafkaHandler: KafkaVideoCompletionHandler | null;

    constructor() {
        this.kafkaHandler = null;
    }

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
                if (!this.kafkaHandler) {
                    this.kafkaHandler = new KafkaVideoCompletionHandler();
                }
                await this.kafkaHandler.waitForVideoCompletions(correlationIds, outputFilePaths);
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
                    fs.unlinkSync(listFilePath);
                    resolve();
                } else {
                    reject(new Error(`ffmpeg process exited with code ${code}`));
                }
            });
        });
    }
}

class KafkaVideoCompletionHandler {
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
                    const parsedMessage = JSON.parse(message.value?.toString() || '{}');
                    if (parsedMessage.status === 'completed') {
                        console.debug(`📨 Kafka message received: ${message.value?.toString()}`);
                        this.correlationTracker.markCompleted(parsedMessage.correlationId);
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
