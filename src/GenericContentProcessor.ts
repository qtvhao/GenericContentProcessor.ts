import BilingualPodcastService from "./BilingualPodcastService.js";
import { VideoCreationOptions } from "./VideoCreationService.js";
import { ImageDownloader } from "./ImageDownloader.js";
import fs from "fs";
import os from "os";
import path from "path";
import { extractWords } from "./utils/words.js";

interface PodcastContent {
    translated: string;
    original: string;
}
interface Word {
    word: string;
    start: number;
    end: number;
}

interface Segment {
    words: Word[];
}

interface Clip {
    segments: Segment[];
    query: string;
    startTime: number;
    endTime: number;
    audioBase64: string;
    audioBuffer?: Buffer;
}

interface PodcastResponse {
    choices: { message: { content: PodcastContent[]; audio: { data: string; buffer?: Buffer; trimmed: Clip[] } } }[];
}

export class GenericContentProcessor {
    private svc: BilingualPodcastService;
    private imageDownloaderCache: Map<string, ImageDownloader> = new Map();

    constructor(svc: BilingualPodcastService) {
        this.svc = svc;
    }

    async checkServiceHealth(): Promise<boolean> {
        console.debug('🩺 Checking service health...');
        const isHealthy = await this.svc.checkHealth();
        if (!isHealthy) {
            console.error('🚑 Service health check failed. Aborting...');
        } else {
            console.debug('✅ Service health check passed.');
        }
        return isHealthy;
    }

    async fetchImages(query: string): Promise<string[]> {
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

    async generateContent(prompt: string): Promise<PodcastResponse | null> {
        console.debug('🎤 Generating content for prompt:', prompt);
        const response = await this.svc.createAndWaitForPodcast(prompt);
        if (response) {
            console.debug('✅ Content generated.');
        } else {
            console.error('❌ Content generation failed.');
        }
        return response;
    }

    extractClipsFromResponse(response: PodcastResponse | null): Clip[] {
        console.debug('🔎 Extracting clips from response...');
        const audioBuffer = Buffer.from(response?.choices[0].message.audio.data || '', 'base64');
        return (response?.choices[0].message.audio.trimmed || []).map((clip, idx) => ({
            ...clip,
            audioBuffer
        }));
    }

    private saveAudioToFile(clip: Clip, filePath: string): void {
        console.debug(`💽 Saving audio to ${filePath}`);
        fs.writeFileSync(filePath, clip.audioBuffer || '');
    }

    async createVideoOptionsFromClip(clip: Clip, clipIndex: number): Promise<VideoCreationOptions | null> {
        console.debug(`🔨 Creating video options from clip ${clipIndex}...`);
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

    async compileVideoCreationOptions(clips: Clip[]): Promise<VideoCreationOptions[]> {
        console.debug('📋 Compiling video creation options...');
        const options: VideoCreationOptions[] = [];

        for (let i = 0; i < clips.length; i++) {
            const option = await this.createVideoOptionsFromClip(clips[i], i + 1);
            if (option) {
                options.push(option);
            }
        }

        return options;
    }
}
