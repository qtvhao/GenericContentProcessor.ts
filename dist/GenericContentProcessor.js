import { ImageDownloader } from "./ImageDownloader.js";
import fs from "fs";
import os from "os";
import path from "path";
import { extractWords } from "./utils/words.js";
import winston from "winston";
export class GenericContentProcessor {
    svc;
    imageDownloaderCache = new Map();
    logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })),
        transports: [new winston.transports.Console()],
    });
    constructor(svc) {
        this.svc = svc;
    }
    async checkServiceHealth() {
        this.logger.debug('🩺 Checking service health...');
        const isHealthy = await this.svc.checkHealth();
        if (!isHealthy) {
            this.logger.error('🚑 Service health check failed. Aborting...');
        }
        else {
            this.logger.debug('✅ Service health check passed.');
        }
        return isHealthy;
    }
    async fetchImages(query) {
        this.logger.debug(`📥 Fetching images for query: "${query}"`);
        let imageDownloader = this.imageDownloaderCache.get(query);
        if (!imageDownloader) {
            imageDownloader = new ImageDownloader(query, 12, undefined, this.logger);
            this.imageDownloaderCache.set(query, imageDownloader);
        }
        const imagesBuffer = await imageDownloader.downloadAllImages();
        const imageFilePaths = imagesBuffer.map((buffer, index) => {
            const tmpDir = os.tmpdir();
            const filePath = path.join(tmpDir, `temp_image_${query.replace(/\s+/g, '_')}_${index}.jpg`);
            fs.writeFileSync(filePath, buffer);
            this.logger.debug(`💾 Saved image ${index} for query "${query}" at ${filePath}`);
            return filePath;
        });
        return imageFilePaths;
    }
    async generateContent(prompt) {
        this.logger.debug('🎤 Generating content for prompt:', prompt);
        const response = await this.svc.createAndWaitForPodcast(prompt);
        if (response) {
            this.logger.debug('✅ Content generated.');
        }
        else {
            this.logger.error('❌ Content generation failed.');
        }
        return response;
    }
    extractClipsFromResponse(response) {
        this.logger.debug('🔎 Extracting clips from response...');
        const audioBuffer = Buffer.from(response?.choices[0].message.audio.data || '', 'base64');
        return (response?.choices[0].message.audio.trimmed || []).map((clip, idx) => ({
            ...clip,
            audioBuffer
        }));
    }
    saveAudioToFile(clip, filePath) {
        this.logger.debug(`💽 Saving audio to ${filePath}`);
        fs.writeFileSync(filePath, clip.audioBuffer || '');
    }
    async createVideoOptionsFromClip(clip, clipIndex) {
        this.logger.debug(`🔨 Creating video options from clip ${clipIndex}...`);
        const tmpDir = os.tmpdir();
        const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const outputFilePath = path.join(tmpDir, `te-${clipIndex}-${uniqueSuffix}.mp4`);
        const words = extractWords(clip);
        const speechFilePath = `speech-${clipIndex}.aac`;
        this.saveAudioToFile(clip, speechFilePath);
        const imageFilePaths = await this.fetchImages(clip.query);
        return {
            startTime: clip.startTime,
            endTime: clip.endTime,
            speechFilePath,
            musicFilePath: './sample-data/emo.mp3',
            imageFilePaths,
            textData: words,
            duration: words[words.length - 1]?.end || clip.endTime,
            fps: 2,
            videoSize: [1920, 1080],
            textConfig: {
                font_color: 'white',
                background_color: 'black'
            },
            outputFilePath
        };
    }
    async compileVideoCreationOptions(clips) {
        this.logger.debug('📋 Compiling video creation options...');
        const options = [];
        for (let i = 0; i < clips.length; i++) {
            const option = await this.createVideoOptionsFromClip(clips[i], i + 1);
            if (option) {
                options.push(option);
            }
        }
        return options;
    }
}
