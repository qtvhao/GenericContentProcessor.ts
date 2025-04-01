import type { Logger } from 'winston';
export type OutputType = 'url' | 'image';
export declare class ImageDownloader {
    private baseUrl;
    private query;
    private limit;
    private logger;
    constructor(searchQuery: string, limit?: number, baseUrl?: string, customLogger?: Logger);
    private quickSearch;
    private getImage;
    private getImageJPG;
    private getImageCount;
    private waitForImages;
    downloadAllImages(): Promise<Buffer[]>;
}
