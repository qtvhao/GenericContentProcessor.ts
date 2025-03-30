interface TextData {
    word: string;
    start: number;
    end: number;
}
export interface VideoCreationOptions {
    startTime: number;
    endTime: number;
    speechFilePath: string;
    musicFilePath: string;
    imageFilePaths: string[];
    textData: TextData[];
    videoSize?: [number, number];
    textConfig?: {
        font_color: string;
        background_color: string;
    };
    fps?: number;
    duration: number;
    outputFilePath: string;
}
declare class VideoCreationService {
    private static kafkaHandler;
    private static API_URL;
    static createVideo(options: VideoCreationOptions): Promise<string>;
    static bulkRequestVideoCreation(optionsArray: VideoCreationOptions[]): Promise<string[]>;
    static waitForVideoCompletions(correlationIds: string[], outputFilePaths: string[]): Promise<void>;
    static bulkPollForVideos(correlationIds: string[], outputFilePaths: string[], options?: {
        maxAttempts?: number;
        delay?: number;
        onProgress?: (index: number, attempt: number, progress?: number) => void;
        onSuccess?: (index: number, filePath: string) => void;
        onError?: (index: number, error: Error) => void;
    }): Promise<void>;
    private static createProgressBar;
    private static validateAndResolveFiles;
    private static prepareFormData;
    private static requestVideoCreation;
    private static pollForVideo;
    private static getContentType;
    private static isVideoReady;
    private static delay;
}
export default VideoCreationService;
