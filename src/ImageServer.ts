import axios from 'axios';
import type { Logger } from 'winston';
export type OutputType = 'url' | 'image';

export class ImageServer {
    private query: string;
    private baseUrl: string;
    private logger: Logger;
    private limit: number;

    constructor(query: string, logger: Logger, limit: number, baseUrl: string = 'https://http-fotosutokku-kiban-production-80.schnworks.com') {
        this.query = query;
        this.baseUrl = baseUrl;
        this.logger = logger;
        this.limit = limit;
    }

    public async startQuickSearchSession(taskId: string, output: OutputType = 'image', index = 0): Promise<string> {
        if (!this.query) throw new Error('Query is required for quick search.');

        const response = await axios.post(`${this.baseUrl}/quick-search`, {
            query: this.query,
            output,
            limit: String(this.limit),
            index: String(index),
            taskId,
        });

        return response.data.conversationId;
    }

    public async getImage(index: number): Promise<Buffer> {
        if (!this.query || typeof index !== 'number') {
            throw new Error('Invalid query or index.');
        }

        const response = await axios.get(`${this.baseUrl}/get-image`, {
            params: {
                query: this.query,
                output: 'image',
                index: index.toString(),
            },
            responseType: 'arraybuffer',
        });

        if (response.headers['content-type']?.includes('application/json')) {
            const json = JSON.parse(Buffer.from(response.data).toString());
            throw new Error(`Image unavailable. FileKey: ${json.fileKey}`);
        }

        return Buffer.from(response.data);
    }

    public async getImageJPG(index: number): Promise<Buffer> {
        const url = `${this.baseUrl}/get-image/image/${encodeURIComponent(this.query)}/${index}/image.jpg`;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
        });

        if (response.headers['content-type']?.includes('application/json')) {
            const json = JSON.parse(Buffer.from(response.data).toString());
            throw new Error(`Image unavailable. FileKey: ${json.fileKey}`);
        }

        return Buffer.from(response.data);
    }

    public async fetchImageCount(): Promise<number> {
        if (!this.query) throw new Error('Query is required.');

        const url = `${this.baseUrl}/image-count/${encodeURIComponent(this.query)}`;
        const response = await axios.get(url);
        this.logger.debug(`Fetched image count for query "${this.query}": ${response.data.count}`);
        return response.data.count;
    }

    public async hasEnoughImages(minCount: number = this.limit): Promise<boolean> {
        try {
            const count = await this.fetchImageCount();
            return count >= minCount;
        } catch (error) {
            this.logger.error(`Error checking image count: ${(error as Error).message}`);
            return false;
        }
    }

    public async waitForImages(options?: {
        retries?: number;
        intervalMs?: number;
        minCount?: number;
    }): Promise<number> {
        const {
            retries = 5 * 60,
            intervalMs = 1_000,
            minCount = 1,
        } = options || {};

        for (let attempt = 0; attempt < retries; attempt++) {
            const hasEnough = await this.hasEnoughImages(minCount);
            this.logger.debug(`Attempt ${attempt + 1}: ${hasEnough ? 'Sufficient images found' : 'Not enough images yet'}`);
            if (hasEnough) {
                const count = await this.fetchImageCount();
                return count;
            }
            await new Promise(res => setTimeout(res, intervalMs));
        }

        throw new Error(`Timeout waiting for images. Tried ${retries} times.`);
    }
}
