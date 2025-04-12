import axios from 'axios';
import { createLogger, transports, format } from 'winston';
import type { Logger } from 'winston';
import { ImageServer, OutputType } from './ImageServer.js';
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [new transports.Console()],
});

export class ImageDownloader {
  private query: string;
  private limit: number;
  private logger: Logger;
  private downloadedImages: Buffer[] = [];
  private taskId: string;

  constructor(
    searchQuery: string,
    limit: number = 10,
    customLogger: Logger = logger,
    taskId: string,
  ) {
    this.query = searchQuery;
    this.limit = limit;
    this.logger = customLogger;
    this.taskId = taskId;
  }

  public async downloadAllImages(): Promise<Buffer[]> {
    this.logger.info(`Starting image download process for query "${this.query}"`);

    const server = new ImageServer(this.query, this.logger, this.limit);
    
    const count = await server.fetchImageCount();
    this.logger.info(`Total available images before search: ${count}`);
    
    if (count < this.limit) {
      await server.startQuickSearchSession(this.taskId);
      await server.waitForImages({ minCount: this.limit });
    }

    const finalCount = await server.fetchImageCount();
    this.logger.info(`Total available images after search: ${finalCount}`);
    
    const max = Math.min(this.limit, finalCount);
    const results = await this.downloadImagesFromServer(server, max);

    this.downloadedImages = results;
    return results;
  }

  private async downloadImagesFromServer(server: ImageServer, max: number): Promise<Buffer[]> {
    const results: Buffer[] = [];
    for (let i = 0; i < max; i++) {
      try {
        const img = await server.getImage(i);
        results.push(img);
      } catch (err) {
        this.logger.warn(`Failed to download image ${i}: ${(err as Error).message}`);
      }
    }
    return results;
  }

  public async getAllDownloadedImages(): Promise<Buffer[]> {
    if (this.downloadedImages.length === 0) {
      this.logger.warn('No previously downloaded images found.');
    } else {
      this.logger.info(`Returning ${this.downloadedImages.length} cached images.`);
    }
    return this.downloadedImages;
  }

  public hasEnoughImages(): boolean {
    return this.downloadedImages.length >= this.limit;
  }

  public async getOrDownloadImages(): Promise<Buffer[]> {
    if (this.hasEnoughImages()) {
      return this.getAllDownloadedImages();
    }
    return this.downloadAllImages();
  }
}
