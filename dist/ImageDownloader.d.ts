export declare class ImageDownloader {
    private baseUrl;
    private searchQuery;
    private limit;
    private headers;
    constructor(searchQuery: string, limit?: number);
    private downloadImage;
    downloadAllImages(): Promise<Buffer[]>;
    private sleep;
}
