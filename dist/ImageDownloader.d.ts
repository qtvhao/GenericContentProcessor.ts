export type OutputType = 'url' | 'image';
export declare class ImageDownloader {
    private baseUrl;
    private query;
    private limit;
    constructor(searchQuery: string, limit?: number, baseUrl?: string);
    private quickSearch;
    private getImage;
    private getImageJPG;
    private getImageCount;
    private waitForImages;
    downloadAllImages(): Promise<Buffer[]>;
}
