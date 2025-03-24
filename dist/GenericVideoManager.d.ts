import { VideoCreationOptions } from "./VideoCreationService.js";
export declare class GenericVideoManager {
    constructor();
    processVideos(options: VideoCreationOptions[], finalOutputPath: string): Promise<void>;
    private requestVideoCreations;
    private pollForVideoCompletions;
    private concatVideosWithFFmpeg;
}
