// src/ImageDownloader.ts

import axios from 'axios';

export type OutputType = 'url' | 'image';

export class ImageDownloader {
  private baseUrl: string;
  private query: string;
  private limit: number;

  constructor(searchQuery: string, limit: number = 10, baseUrl: string = 'https://http-fotosutokku-kiban-production-80.schnworks.com') {
    this.baseUrl = baseUrl;
    this.query = searchQuery;
    this.limit = limit;
  }

  private async quickSearch(output: OutputType = 'image', index = 0): Promise<string> {
    if (!this.query) throw new Error('Query is required for quick search.');

    const response = await axios.post(`${this.baseUrl}/quick-search`, {
      query: this.query,
      output,
      limit: String(this.limit),
      index: String(index),
    });

    return response.data.conversationId;
  }

  private async getImage(index: number): Promise<Buffer> {
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

  private async getImageJPG(index: number): Promise<Buffer> {
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

  private async getImageCount(): Promise<number> {
    if (!this.query) throw new Error('Query is required.');

    const url = `${this.baseUrl}/image-count/${encodeURIComponent(this.query)}`;
    const response = await axios.get(url);
    return response.data.count;
  }

  private async waitForImages(options?: {
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
      const count = await this.getImageCount();
      if (count >= minCount) {
        return count;
      }
      await new Promise(res => setTimeout(res, intervalMs));
    }

    throw new Error(`Timeout waiting for images. Tried ${retries} times.`);
  }

  public async downloadAllImages(): Promise<Buffer[]> {
    await this.quickSearch();
    await this.waitForImages({ minCount: this.limit });

    const count = await this.getImageCount();
    const max = Math.min(this.limit, count);
    const results: Buffer[] = [];

    for (let i = 0; i < max; i++) {
      try {
        const img = await this.getImage(i);
        results.push(img);
      } catch (err) {
        console.warn(`Failed to download image ${i}:`, (err as Error).message);
      }
    }

    return results;
  }
}
