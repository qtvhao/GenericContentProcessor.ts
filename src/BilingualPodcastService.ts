import axios from 'axios';
import { readCache, writeCache } from './utils/cache.js';

interface PodcastContent {
  translated: string;
  original: string;
}

interface PodcastAudioSegment {
  parentTaskId: string;
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

class BilingualPodcastService {
  private apiUrl: string;

  constructor(apiUrl: string = 'https://http-bairingaru-okane-production-80.schnworks.com') {
    this.apiUrl = apiUrl;
  }

  async checkHealth(): Promise<boolean> {
    const healthUrl = `${this.apiUrl}/healthz`;
    try {
      const response = await axios.get(healthUrl);
      if (response.status === 200) {
        console.log('✅ BilingualPodcastService is healthy.');
        return true;
      } else {
        console.error(`❌ Health check failed. Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error checking health: ${(error as Error).message}`);
      return false;
    }
  }

  private async createPodcast(prompt: string): Promise<string> {
    try {
      const response = await axios.post<PodcastResponse>(`${this.apiUrl}/api/podcasts`, { prompt });

      if (response.data.correlationId) {
        return response.data.correlationId;
      }
      throw new Error('Failed to retrieve correlationId');
    } catch (error) {
      console.error('Error creating podcast:', error);
      throw error;
    }
  }

  private async getPodcastStatus(correlationId: string): Promise<PodcastResponse | null> {
    const response = await axios.get<PodcastResponse>(`${this.apiUrl}/api/podcasts/${correlationId}`, {
      validateStatus: function (status) {
        return status < 500;
      }
    });
    return response.data;
  }

  private async pollForPodcastStatus(correlationId: string, maxRetries: number, delay: number): Promise<PodcastResponse | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const statusResponse = await this.getPodcastStatus(correlationId);

      if (statusResponse?.error) {
        console.error('Podcast generation error:', statusResponse.error);
      }
      if (statusResponse?.choices) {
        return statusResponse;
      }

      console.log(`[BAIRINGARU] Attempt ${attempt + 1}: Podcast not ready yet. Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }

  private async waitForPodcast(correlationId: string, maxRetries = 10, delay = 5000, maxFiveXXRetries: number = 5): Promise<PodcastResponse | null> {
    const cacheKey = `podcast_status_${correlationId}.json`;

    let fiveXXRetryCount = 0;
    while (fiveXXRetryCount < maxFiveXXRetries) {
      try {
        const statusResponse = await this.pollForPodcastStatus(correlationId, maxRetries, delay);
        if (statusResponse) {
          return statusResponse;
        }
        break; // Exit loop if response is null (maxRetries reached)
      } catch (error: any) {
        if (error.response && error.response.status >= 500 && error.response.status < 600) {
          fiveXXRetryCount++;
          console.warn(`5xx error (${error.response.status}) encountered (${fiveXXRetryCount}/${maxFiveXXRetries}). Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 60_000));
        } else {
          console.error('Error waiting for podcast:', error);
          break;
        }
      }
    }

    console.error('Max retries reached. Podcast not available.');
    return null;
  }

  private hashPromptDjb2(prompt: string): number {
    let hash = 5381;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) + hash) + prompt.charCodeAt(i);
    }
    return hash >>> 0; // Ensure unsigned 32-bit
  }

  async createAndWaitForPodcast(prompt: string, maxRetries = 12 * 30, delay = 5000): Promise<PodcastResponse | null> {
    const hash = this.hashPromptDjb2(prompt);
    const cacheKey = `full_podcast_${hash}.json`;

    try {
      const cachedResponse = await readCache(cacheKey);
      if (cachedResponse) {
        return JSON.parse(cachedResponse);
      }

      const correlationId = await this.createPodcast(prompt);
      const response = await this.waitForPodcast(correlationId, maxRetries, delay);

      if (response) {
        await writeCache(cacheKey, Buffer.from(JSON.stringify(response)));
      }

      return response;
    } catch (error) {
      console.error('Error creating and waiting for podcast:', error);
      return null;
    }
  }
}

export default BilingualPodcastService;
