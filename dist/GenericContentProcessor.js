import { ImageDownloader } from "./ImageDownloader.js";
import fs from "fs";
import os from "os";
import path from "path";
import { extractWords } from "./utils/words.js";
export class GenericContentProcessor {
    svc;
    imageDownloaderCache = new Map();
    constructor(svc) {
        this.svc = svc;
    }
    async checkServiceHealth() {
        console.debug('🩺 Checking service health...');
        const isHealthy = await this.svc.checkHealth();
        if (!isHealthy) {
            console.error('🚑 Service health check failed. Aborting...');
        }
        else {
            console.debug('✅ Service health check passed.');
        }
        return isHealthy;
    }
    async fetchImages(query) {
        console.debug(`📥 Fetching images for query: "${query}"`);
        let imageDownloader = this.imageDownloaderCache.get(query);
        if (!imageDownloader) {
            imageDownloader = new ImageDownloader(query, 12);
            this.imageDownloaderCache.set(query, imageDownloader);
        }
        const imagesBuffer = await imageDownloader.downloadAllImages();
        const imageFilePaths = imagesBuffer.map((buffer, index) => {
            const tmpDir = os.tmpdir();
            const filePath = path.join(tmpDir, `temp_image_${query.replace(/\s+/g, '_')}_${index}.jpg`);
            fs.writeFileSync(filePath, buffer);
            console.debug(`💾 Saved image ${index} for query "${query}" at ${filePath}`);
            return filePath;
        });
        return imageFilePaths;
    }
    async generateContent(prompt) {
        console.debug('🎤 Generating content for prompt:', prompt);
        const response = await this.svc.createAndWaitForPodcast(prompt);
        if (response) {
            console.debug('✅ Content generated.');
        }
        else {
            console.error('❌ Content generation failed.');
        }
        return response;
    }
    extractClipsFromResponse(response) {
        console.debug('🔎 Extracting clips from response...');
        const audioBuffer = Buffer.from(response?.choices[0].message.audio.data || '', 'base64');
        return (response?.choices[0].message.audio.trimmed || []).map((clip, idx) => ({
            ...clip,
            audioBuffer
        }));
    }
    saveAudioToFile(clip, filePath) {
        console.debug(`💽 Saving audio to ${filePath}`);
        fs.writeFileSync(filePath, clip.audioBuffer || '');
    }
    async createVideoOptionsFromClip(clip, clipIndex) {
        console.debug(`🔨 Creating video options from clip ${clipIndex}...`);
        const outputFilePath = `./te-${clipIndex}.mp4`;
        if (fs.existsSync(outputFilePath)) {
            console.warn(`⚠️ Clip ${clipIndex} already exists. Skipping.`);
            return null;
        }
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
        console.debug('📋 Compiling video creation options...');
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
