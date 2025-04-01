import BilingualPodcastService from "./BilingualPodcastService.js";
import { VideoCreationOptions } from "./VideoCreationService.js";
import winston from "winston";
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
    choices: {
        message: {
            content: PodcastContent[];
            audio: {
                data: string;
                buffer?: Buffer;
                trimmed: Clip[];
            };
        };
    }[];
}
export declare class GenericContentProcessor {
    private svc;
    private imageDownloaderCache;
    private logger;
    constructor(svc: BilingualPodcastService, logger?: winston.Logger);
    checkServiceHealth(): Promise<boolean>;
    fetchImages(query: string): Promise<string[]>;
    generateContent(prompt: string): Promise<PodcastResponse | null>;
    extractClipsFromResponse(response: PodcastResponse | null): Clip[];
    private saveAudioToFile;
    createVideoOptionsFromClip(clip: Clip, clipIndex: number): Promise<VideoCreationOptions | null>;
    compileVideoCreationOptions(clips: Clip[]): Promise<VideoCreationOptions[]>;
}
export {};
