interface PodcastContent {
    translated: string;
    original: string;
}
interface PodcastAudioSegment {
    segments: any[];
    original: string;
    translated: string;
    startTime: number;
    endTime: number;
    audioBase64: string;
    query: string;
}
interface PodcastMessage {
    content: PodcastContent[];
    audio: {
        data: string;
        buffer?: Buffer;
        trimmed: PodcastAudioSegment[];
    };
}
interface PodcastChoice {
    message: PodcastMessage;
}
interface PodcastResponse {
    correlationId: string;
    status?: string;
    choices: PodcastChoice[];
    error?: string;
}
declare class BilingualPodcastService {
    private apiUrl;
    constructor(apiUrl?: string);
    checkHealth(): Promise<boolean>;
    createPodcast(prompt: string): Promise<string>;
    getPodcastStatus(correlationId: string): Promise<PodcastResponse | null>;
    waitForPodcast(correlationId: string, maxRetries?: number, delay?: number): Promise<PodcastResponse | null>;
    createAndWaitForPodcast(prompt: string, maxRetries?: number, delay?: number): Promise<PodcastResponse | null>;
}
export default BilingualPodcastService;
