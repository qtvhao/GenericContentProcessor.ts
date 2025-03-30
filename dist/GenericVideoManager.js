import VideoCreationService from "./VideoCreationService.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
export class GenericVideoManager {
    async processVideos(options, finalOutputPath, useKafka = false) {
        try {
            console.debug('🚚 Requesting video creation...');
            const correlationIds = await this.requestVideoCreations(options);
            console.debug('⏳ Waiting for video completion...');
            const outputFilePaths = options.map(opt => opt.outputFilePath);
            await this.pollForVideoCompletions(correlationIds, outputFilePaths, useKafka);
            console.log('🎉 All videos processed and downloaded!');
            console.debug('🎬 Starting video concatenation...');
            await this.concatVideosWithFFmpeg(outputFilePaths, finalOutputPath);
            console.log(`✅ Final video concatenated at ${finalOutputPath}`);
        }
        catch (error) {
            console.error('❌ Error processing videos:', error);
        }
    }
    async requestVideoCreations(options) {
        console.debug('📨 Sending video creation request...');
        const ids = await VideoCreationService.bulkRequestVideoCreation(options);
        console.debug('✅ Correlation IDs received:', ids);
        return ids;
    }
    async pollForVideoCompletions(correlationIds, outputFilePaths, useKafka = false) {
        console.debug('📡 Polling for video completions...');
        const onSuccess = (index, filePath) => {
            console.log(`✅ [Clip ${index + 1}] Video completed at ${filePath}`);
        };
        const onError = (index, error) => {
            console.error(`❌ [Clip ${index + 1}] Failed after retries. Error: ${error.message}`);
        };
        if (useKafka) {
            await VideoCreationService.waitForVideoCompletions(correlationIds, outputFilePaths);
        }
        else {
            await VideoCreationService.bulkPollForVideos(correlationIds, outputFilePaths, {
                maxAttempts: 60 * 20,
                delay: 1000,
                onSuccess,
                onError
            });
        }
        console.debug('🏁 Finished polling.');
    }
    async concatVideosWithFFmpeg(inputFilePaths, outputFilePath) {
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
                }
                else {
                    reject(new Error(`ffmpeg process exited with code ${code}`));
                }
            });
        });
    }
}
