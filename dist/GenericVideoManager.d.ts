import { VideoCreationOptions } from "./VideoCreationService.js";
export declare class GenericVideoManager {
    private completed;
    constructor();
    processVideos(options: VideoCreationOptions[], finalOutputPath: string, useKafka?: boolean): Promise<void>;
    private requestVideoCreations;
    private pollForVideoCompletions;
    private concatVideosWithFFmpeg;
    private waitForVideoCompletions;
    private buildCorrelationMap;
    private handleKafkaMessage;
}
