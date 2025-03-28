import { VideoCreationOptions } from "./VideoCreationService.js";
export declare class GenericVideoManager {
    constructor();
    processVideos(options: VideoCreationOptions[], finalOutputPath: string, useKafka?: boolean): Promise<void>;
    private requestVideoCreations;
    private pollForVideoCompletions;
    private concatVideosWithFFmpeg;
}
export declare class KafkaVideoCompletionHandler {
    waitForVideoCompletions(correlationIds: string[], outputFilePaths: string[]): Promise<void>;
    private buildCorrelationMap;
    private handleKafkaMessage;
}
