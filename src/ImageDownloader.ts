import axios, { AxiosRequestConfig } from 'axios';

export class ImageDownloader {
  private baseUrl: string;
  private searchQuery: string;
  private limit: number;
  private headers: Record<string, string>;
  private cache: Map<number, Buffer>; // Cache to store downloaded images

  constructor(searchQuery: string, limit: number = 10) {
    this.baseUrl = 'https://http-fotosutokku-kiban-production-80.schnworks.com/search';
    this.searchQuery = searchQuery;
    this.limit = limit;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; NanoTechImageDownloader/1.0)',
    };
    this.cache = new Map();
  }

  // Download a single image by index and return its buffer
  private async downloadImage(index: number, timeoutMs?: number): Promise<Buffer | null> {
    // Check cache first
    if (this.cache.has(index)) {
      console.log(`Image ${index + 1} retrieved from cache.`);
      return this.cache.get(index) || null;
    }

    const params = {
      query: this.searchQuery,
      limit: this.limit,
      output: 'image',
      index: index,
    };

    const config: AxiosRequestConfig = {
      headers: this.headers,
      responseType: 'arraybuffer', // get binary data
      params: params,
    };

    if (timeoutMs) {
      config.timeout = timeoutMs; // Set timeout if provided
    }

    try {
      const response = await axios.get(this.baseUrl, config);

      const contentType = response.headers['content-type'];
      if (!contentType.includes('image')) {
        console.warn(`Skipped index ${index}: Content-Type is ${contentType}`);
        return null;
      }

      const buffer = Buffer.from(response.data);
      console.log(`Downloaded image ${index + 1} -> Buffer size: ${buffer.length} bytes`);

      this.cache.set(index, buffer); // Store in cache

      return buffer;
    } catch (error) {
      console.error(`Failed to download image ${index + 1}:`, (error as Error).message);
      return null;
    }
  }

  // Download images in a loop, collect their buffers
  public async downloadAllImages(): Promise<Buffer[]> {
    const imageBuffers: Buffer[] = [];

    for (let index = 0; index < this.limit; index++) {
      let timeoutMs: number | undefined;

      // Apply 5-second timeout to the second image (index 1)
      if (index > 0) {
        timeoutMs = 60_000;
        console.log(`Applying 5-second timeout for image ${index + 1}`);
      }

      const isCached = this.cache.has(index);
      const buffer = await this.downloadImage(index, timeoutMs);
      if (buffer) {
        imageBuffers.push(buffer);
      }

      if (!isCached) {
        await this.sleep(1000); // Wait 1 second between requests only if not cached
      }
    }

    console.log('Download complete!');
    return imageBuffers;
  }

  // Utility sleep function
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
