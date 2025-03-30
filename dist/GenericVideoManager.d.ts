import { VideoCreationOptions } from "./VideoCreationService.js";
export declare class GenericVideoManager {
    processVideos(options: VideoCreationOptions[], finalOutputPath: string, useKafka?: boolean): Promise<void>;
    private requestVideoCreations;
    private pollForVideoCompletions;
    private concatVideosWithFFmpeg;
}
